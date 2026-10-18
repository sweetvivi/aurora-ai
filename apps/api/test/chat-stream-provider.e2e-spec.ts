import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import {
  createServer,
  request as httpRequest,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from 'node:http';
import type { AddressInfo } from 'node:net';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { AppModule } from '../src/app.module';
import { configureApplication } from '../src/bootstrap/configure-app';
import { PrismaService } from '../src/infrastructure/prisma/prisma.service';
import { ModelRegistryService } from '../src/models/model-registry.service';

// Nest validates `process.env` while `app.module.ts` is imported, so the stub credentials
// have to be in place before any other module in this file is evaluated.
const STUB_ENVIRONMENT = vi.hoisted(() => {
  process.env.LLM_API_KEY = 'e2e-stub-llm-key';
  process.env.LLM_REQUEST_TIMEOUT_MS = '1000';

  return { apiKey: 'e2e-stub-llm-key' };
});

const PROVIDER_CODE_PREFIX = 'e2e-stream-provider-';
const MODEL_ALIAS_PREFIX = 'e2e-stream-model-';
const USER_EMAIL_SUFFIX = '@chat-stream-test.local';
const PROVIDER_MODEL = 'stub-stream-model';
const EXPECTED_ANSWER = '真实流式对话';

type StubMode = 'auth-error' | 'handshake' | 'reasoning-only' | 'stall' | 'success';

interface StubRequestRecord {
  authorization?: string;
  body: {
    messages?: Array<{ content?: unknown; role?: string }>;
    model?: string;
    reasoning_effort?: string;
    stream?: boolean;
    temperature?: number;
  };
  method?: string;
  url?: string;
}

describe('chat streaming through the real OpenAI-compatible provider', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let providerCode: string;
  let modelAlias: string;
  let stubBaseUrl: string;
  let stubMode: StubMode;
  let stubRequests: StubRequestRecord[];
  let stubServer: Server;
  let firstDeltaGate: Promise<void>;
  let releaseFirstDelta: () => void;

  beforeAll(async () => {
    providerCode = `${PROVIDER_CODE_PREFIX}${randomUUID().slice(0, 8)}`;
    modelAlias = `${MODEL_ALIAS_PREFIX}${randomUUID().slice(0, 8)}`;
    stubMode = 'success';
    stubRequests = [];
    firstDeltaGate = Promise.resolve();
    releaseFirstDelta = () => undefined;
    stubServer = createServer((incoming, outgoing) => {
      void handleStubRequest(incoming, outgoing).catch(() => {
        outgoing.destroy();
      });
    });

    await new Promise<void>((resolve) => {
      stubServer.listen(0, '127.0.0.1', resolve);
    });

    const address = stubServer.address() as AddressInfo;
    stubBaseUrl = `http://127.0.0.1:${address.port}/v1`;

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    configureApplication(app);
    await app.init();
    await app.listen(0);
    prisma = app.get(PrismaService);

    const provider = await prisma.providerConfig.create({
      data: {
        baseUrl: stubBaseUrl,
        code: providerCode,
        displayName: 'E2E 流式对话 Provider',
        keyRef: 'LLM_API_KEY',
        priority: 1,
      },
    });

    await prisma.modelConfig.create({
      data: {
        alias: modelAlias,
        capabilities: ['CHAT'],
        displayName: 'E2E 流式对话模型',
        providerId: provider.id,
        providerModel: PROVIDER_MODEL,
      },
    });

    await app.get(ModelRegistryService).reload();
  });

  afterAll(async () => {
    await prisma.modelConfig.deleteMany({
      where: { alias: { startsWith: MODEL_ALIAS_PREFIX } },
    });
    await prisma.providerConfig.deleteMany({
      where: { code: { startsWith: PROVIDER_CODE_PREFIX } },
    });
    await prisma.user.deleteMany({
      where: { email: { endsWith: USER_EMAIL_SUFFIX } },
    });
    await app.close();

    await new Promise<void>((resolve, reject) => {
      stubServer.close((error) => (error ? reject(error) : resolve()));
    });
  });

  it('streams provider deltas, persists the answer, and settles points once', async () => {
    stubMode = 'success';
    stubRequests = [];
    const { accessToken, email } = await registerUser();

    const response = await request(app.getHttpServer())
      .post('/api/v1/chat/stream')
      .set('authorization', `Bearer ${accessToken}`)
      .set('idempotency-key', randomUUID())
      .send({
        content: '真实链路测试',
        modelAlias,
        reasoningEffort: 'medium',
        temperature: 0.3,
      })
      .expect(200);

    expect(response.headers['content-type']).toContain('text/event-stream');

    const deltas = readEvents(response.text, 'delta') as Array<{ content: string }>;
    const done = readEvent(response.text, 'done') as { balance: number; status: string };

    expect(deltas.map((delta) => delta.content).join('')).toBe(EXPECTED_ANSWER);
    expect(deltas).toHaveLength(3);
    expect(response.text).not.toContain('我先想想');
    expect(done).toMatchObject({ balance: 99, status: 'COMPLETED' });

    expect(stubRequests).toHaveLength(1);
    const providerRequest = stubRequests[0];

    expect(providerRequest).toMatchObject({
      authorization: `Bearer ${STUB_ENVIRONMENT.apiKey}`,
      method: 'POST',
      url: '/v1/chat/completions',
    });
    expect(providerRequest?.body).toMatchObject({
      model: PROVIDER_MODEL,
      reasoning_effort: 'medium',
      stream: true,
      temperature: 0.3,
    });
    expect(providerRequest?.body.messages?.at(-1)).toEqual({
      content: '真实链路测试',
      role: 'user',
    });

    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    const assistantMessage = await prisma.message.findFirstOrThrow({
      where: { role: 'ASSISTANT', userId: user.id },
    });

    expect(user.pointsBalance).toBe(99);
    expect(assistantMessage).toMatchObject({
      content: EXPECTED_ANSWER,
      status: 'COMPLETED',
    });

    const chatRequest = await prisma.chatRequest.findFirstOrThrow({
      where: { userId: user.id },
    });

    expect(chatRequest.status).toBe('COMPLETED');
  });

  it('reports an authentication failure and refunds the reserved points', async () => {
    stubMode = 'auth-error';
    stubRequests = [];
    const { accessToken, email } = await registerUser();

    const response = await request(app.getHttpServer())
      .post('/api/v1/chat/stream')
      .set('authorization', `Bearer ${accessToken}`)
      .set('idempotency-key', randomUUID())
      .send({ content: '鉴权失败测试', modelAlias })
      .expect(200);

    const errorEvent = readEvent(response.text, 'error') as {
      code: string;
      message: string;
      refunded: boolean;
      requestId: string;
    };

    expect(errorEvent).toMatchObject({
      code: 'LLM_AUTH_ERROR',
      message: '模型服务鉴权失败，请联系管理员',
      refunded: true,
    });

    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    const chatRequest = await prisma.chatRequest.findUniqueOrThrow({
      where: { id: errorEvent.requestId },
    });
    const assistantMessage = await prisma.message.findFirstOrThrow({
      where: { requestId: errorEvent.requestId, role: 'ASSISTANT' },
    });
    const ledger = await prisma.pointsLedgerEntry.findMany({
      orderBy: { createdAt: 'asc' },
      where: { userId: user.id },
    });

    expect(user.pointsBalance).toBe(100);
    expect(chatRequest.status).toBe('REFUNDED');
    expect(assistantMessage.status).toBe('FAILED');
    expect(ledger.map((entry) => entry.type)).toEqual(['GRANT', 'HOLD', 'REFUND']);
  });

  it('treats a reasoning-only stream as an empty response and refunds the points', async () => {
    stubMode = 'reasoning-only';
    stubRequests = [];
    const { accessToken, email } = await registerUser();

    const response = await request(app.getHttpServer())
      .post('/api/v1/chat/stream')
      .set('authorization', `Bearer ${accessToken}`)
      .set('idempotency-key', randomUUID())
      .send({ content: '仅返回思考过程', modelAlias })
      .expect(200);

    const errorEvent = readEvent(response.text, 'error') as {
      code: string;
      message: string;
      refunded: boolean;
    };

    expect(errorEvent).toMatchObject({
      code: 'LLM_EMPTY_RESPONSE',
      message: '模型没有返回有效内容，请重试',
      refunded: true,
    });

    const user = await prisma.user.findUniqueOrThrow({ where: { email } });

    expect(user.pointsBalance).toBe(100);
  });

  it('forwards deltas while the upstream stream is still open', async () => {
    stubMode = 'handshake';
    stubRequests = [];
    createFirstDeltaGate();
    const { accessToken, email } = await registerUser();
    const stream = openChatStream(accessToken, '流式握手测试');
    const firstDelta = await stream.firstDelta;

    expect(firstDelta).toEqual({ content: '第一段' });

    releaseFirstDelta();

    const completedText = await stream.completed;
    const done = readEvent(completedText, 'done') as { balance: number; status: string };

    expect(done).toMatchObject({ balance: 99, status: 'COMPLETED' });
    expect(
      (readEvents(completedText, 'delta') as Array<{ content: string }>).map(
        (item) => item.content,
      ),
    ).toEqual(['第一段', '第二段']);

    const user = await prisma.user.findUniqueOrThrow({ where: { email } });

    expect(user.pointsBalance).toBe(99);
  });

  it('refunds the points when the provider stalls past the request timeout', async () => {
    stubMode = 'stall';
    stubRequests = [];
    const { accessToken, email } = await registerUser();

    const response = await request(app.getHttpServer())
      .post('/api/v1/chat/stream')
      .set('authorization', `Bearer ${accessToken}`)
      .set('idempotency-key', randomUUID())
      .send({ content: '超时测试', modelAlias })
      .expect(200);

    const errorEvent = readEvent(response.text, 'error') as {
      code: string;
      message: string;
      refunded: boolean;
    };

    expect(errorEvent).toMatchObject({
      code: 'LLM_TIMEOUT',
      message: '模型响应超时，本次积分已退回',
      refunded: true,
    });

    const user = await prisma.user.findUniqueOrThrow({ where: { email } });

    expect(user.pointsBalance).toBe(100);
  });

  function createFirstDeltaGate(): void {
    firstDeltaGate = new Promise<void>((resolve) => {
      releaseFirstDelta = resolve;
    });
  }

  function openChatStream(
    accessToken: string,
    content: string,
  ): { completed: Promise<string>; firstDelta: Promise<{ content: string }> } {
    const serverAddress = app.getHttpServer().address() as AddressInfo;
    let buffered = '';
    let body = '';
    let firstDeltaSettled = false;
    let resolveFirstDelta: (value: { content: string }) => void = () => undefined;
    let rejectFirstDelta: (error: Error) => void = () => undefined;
    const firstDelta = new Promise<{ content: string }>((resolve, reject) => {
      resolveFirstDelta = resolve;
      rejectFirstDelta = reject;
    });

    const completed = new Promise<string>((resolve, reject) => {
      const outgoing = httpRequest(
        {
          headers: {
            authorization: `Bearer ${accessToken}`,
            'content-type': 'application/json',
            'idempotency-key': randomUUID(),
          },
          host: '127.0.0.1',
          method: 'POST',
          path: '/api/v1/chat/stream',
          port: serverAddress.port,
        },
        (incoming) => {
          incoming.setEncoding('utf8');
          incoming.on('data', (chunk: string) => {
            body += chunk;
            buffered += chunk;
            const frames = buffered.split('\n\n');
            buffered = frames.pop() ?? '';

            for (const frame of frames) {
              if (firstDeltaSettled || !frame.startsWith('event: delta\n')) {
                continue;
              }

              firstDeltaSettled = true;
              resolveFirstDelta(
                JSON.parse(frame.slice(frame.indexOf('\n') + 1).replace(/^data: /, '')) as {
                  content: string;
                },
              );
            }
          });
          incoming.on('end', () => {
            if (!firstDeltaSettled) {
              firstDeltaSettled = true;
              rejectFirstDelta(new Error('流在首个 delta 到达前就结束了'));
            }

            resolve(body);
          });
        },
      );

      outgoing.on('error', reject);
      outgoing.end(JSON.stringify({ content, modelAlias }));
    });

    return { completed, firstDelta };
  }

  async function handleStubRequest(
    incoming: IncomingMessage,
    outgoing: ServerResponse,
  ): Promise<void> {
    const chunks: Buffer[] = [];

    for await (const chunk of incoming) {
      chunks.push(Buffer.from(chunk as Buffer));
    }

    const rawBody = Buffer.concat(chunks).toString('utf8');

    stubRequests.push({
      authorization: incoming.headers.authorization,
      body: rawBody.length > 0 ? JSON.parse(rawBody) : {},
      method: incoming.method,
      url: incoming.url,
    });
    outgoing.on('error', () => undefined);

    if (stubMode === 'auth-error') {
      outgoing.writeHead(401, { 'content-type': 'application/json' });
      outgoing.end(JSON.stringify({ error: { message: 'invalid api key' } }));
      return;
    }

    outgoing.writeHead(200, {
      'cache-control': 'no-cache',
      connection: 'keep-alive',
      'content-type': 'text/event-stream',
    });

    if (stubMode === 'stall') {
      await delay(3_000);

      if (!outgoing.destroyed && !outgoing.writableEnded) {
        outgoing.end();
      }

      return;
    }

    if (stubMode === 'handshake') {
      outgoing.write('data: {"choices":[{"delta":{"content":"第一段"}}]}\n\n');
      await waitForFirstDelta();
      outgoing.write('data: {"choices":[{"delta":{"content":"第二段"}}]}\n\n');
      outgoing.write('data: [DONE]\n\n');
      outgoing.end();
      return;
    }

    if (stubMode === 'reasoning-only') {
      outgoing.write('data: {"choices":[{"delta":{"reasoning_content":"只思考不回答"}}]}\n\n');
      outgoing.write('data: [DONE]\n\n');
      outgoing.end();
      return;
    }

    // Split payloads across writes so the parser has to stitch TCP chunks back together.
    outgoing.write('data: {"choices":[{"delta":{"role":"assistant","content":""}}]}\n\n');
    await delay(10);
    outgoing.write('data: {"choices":[{"delta":{"reasoning_cont');
    await delay(10);
    outgoing.write('ent":"我先想想"}}]}\n\n');
    await delay(10);
    outgoing.write(
      `data: {"choices":[{"delta":{"content":"${EXPECTED_ANSWER.slice(0, 2)}"}}]}\n\n`,
    );
    await delay(10);
    outgoing.write(`data: {"choices":[{"delta":{"content":"${EXPECTED_ANSWER.slice(2, 4)}"}}]}`);
    await delay(10);
    outgoing.write(
      `\n\ndata: {"choices":[{"delta":{"content":"${EXPECTED_ANSWER.slice(4)}"}}]}\n\n`,
    );
    await delay(10);
    outgoing.write('data: {"choices":[],"usage":{"completion_tokens":6,"total_tokens":15}}\n\n');
    await delay(10);
    outgoing.write('data: [DONE]\n\n');
    outgoing.end();
  }

  async function waitForFirstDelta(): Promise<void> {
    let guard: NodeJS.Timeout | undefined;

    try {
      await Promise.race([
        firstDeltaGate,
        new Promise<never>((_, reject) => {
          guard = setTimeout(() => reject(new Error('客户端没有在 5 秒内观察到首个 delta')), 5_000);
        }),
      ]);
    } finally {
      if (guard) {
        clearTimeout(guard);
      }
    }
  }

  async function registerUser(): Promise<{ accessToken: string; email: string }> {
    const email = `chat-stream-${randomUUID()}${USER_EMAIL_SUFFIX}`;
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/email/register')
      .send({
        displayName: '流式对话测试用户',
        email,
        password: 'correct-horse-battery',
      })
      .expect(201);

    return {
      accessToken: response.body.data.accessToken as string,
      email,
    };
  }
});

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function readEvent(payload: string, eventName: string): unknown {
  return readEvents(payload, eventName)[0];
}

function readEvents(payload: string, eventName: string): unknown[] {
  return payload
    .split(/\n\n/)
    .map((frame) => frame.trim())
    .filter((frame) => frame.startsWith(`event: ${eventName}\n`))
    .map((frame) => JSON.parse(frame.slice(frame.indexOf('\n') + 1).replace(/^data: /, '')));
}
