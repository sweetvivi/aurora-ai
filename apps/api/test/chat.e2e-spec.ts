import { ServiceUnavailableException, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';
import { configureApplication } from '../src/bootstrap/configure-app';
import { PrismaService } from '../src/infrastructure/prisma/prisma.service';
import type {
  LlmProvider,
  StreamChatEvent,
  StreamChatRequest,
} from '../src/providers/llm-provider';
import { LLM_PROVIDER } from '../src/providers/llm-provider';

describe('chat and conversation endpoints', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let providerMode: 'failure' | 'success';
  let lastProviderRequest: StreamChatRequest | null;

  const provider: LlmProvider = {
    async *streamChat(input: StreamChatRequest): AsyncGenerator<StreamChatEvent> {
      lastProviderRequest = input;

      if (providerMode === 'failure') {
        throw new ServiceUnavailableException({
          code: 'LLM_UNAVAILABLE',
          message: 'provider unavailable',
        });
      }

      yield { content: '流式', type: 'delta' };
      yield { content: '回复', type: 'delta' };
      yield { type: 'done' };
    },
  };

  beforeAll(async () => {
    providerMode = 'success';
    lastProviderRequest = null;

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(LLM_PROVIDER)
      .useValue(provider)
      .compile();

    app = moduleRef.createNestApplication();
    configureApplication(app);
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: {
        email: {
          endsWith: '@chat-test.local',
        },
      },
    });
    await app.close();
  });

  it('lists public model aliases and manages conversation history', async () => {
    const { accessToken } = await registerUser();

    const modelsResponse = await request(app.getHttpServer())
      .get('/api/v1/models?capability=chat')
      .set('authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(modelsResponse.body.data.items).toHaveLength(8);
    expect(modelsResponse.body.data.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          alias: 'openai-gpt-6-astra',
          capabilities: ['chat'],
          displayName: 'GPT-6 Astra',
        }),
        expect.objectContaining({
          alias: 'openai-gpt-6-sol',
          capabilities: ['chat'],
          displayName: 'GPT-6 Sol',
        }),
        expect.objectContaining({
          alias: 'deepseek-v4-pro-0813',
          capabilities: ['chat'],
          displayName: 'DeepSeek V4 Pro',
        }),
        expect.objectContaining({
          alias: 'deepseek-v4-1-flash-0910',
          capabilities: ['chat'],
          displayName: 'DeepSeek V4.1 Flash',
        }),
        expect.objectContaining({
          alias: 'qwen-3-8-max',
          capabilities: ['chat'],
          displayName: 'Qwen 3.8 Max',
        }),
        expect.objectContaining({
          alias: 'qwen-3-8-flash',
          capabilities: ['chat'],
          displayName: 'Qwen 3.8 Flash',
        }),
        expect.objectContaining({
          alias: 'qwen-3-8-27b',
          capabilities: ['chat'],
          displayName: 'Qwen 3.8 27B',
        }),
        expect.objectContaining({
          alias: 'qwen-3-8-max-0902',
          capabilities: ['chat'],
          displayName: 'Qwen 3.8 Max 0902',
        }),
      ]),
    );
    expect(modelsResponse.body.data.items.every((item: object) => !('providerModel' in item))).toBe(
      true,
    );

    const conversationResponse = await request(app.getHttpServer())
      .post('/api/v1/conversations')
      .set('authorization', `Bearer ${accessToken}`)
      .send({
        modelAlias: 'openai-gpt-6-astra',
        title: '测试会话',
      })
      .expect(201);

    expect(conversationResponse.body.data).toMatchObject({
      modelAlias: 'openai-gpt-6-astra',
      title: '测试会话',
    });

    const conversationId = conversationResponse.body.data.id as string;
    const listResponse = await request(app.getHttpServer())
      .get('/api/v1/conversations')
      .set('authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(listResponse.body.data.items).toHaveLength(1);

    const detailResponse = await request(app.getHttpServer())
      .get(`/api/v1/conversations/${conversationId}`)
      .set('authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(detailResponse.body.data).toMatchObject({
      id: conversationId,
      messages: [],
    });
  });

  it('streams a completion, persists messages, and settles points once', async () => {
    providerMode = 'success';
    const { accessToken, email } = await registerUser();
    const idempotencyKey = randomUUID();

    const response = await request(app.getHttpServer())
      .post('/api/v1/chat/stream')
      .set('authorization', `Bearer ${accessToken}`)
      .set('idempotency-key', idempotencyKey)
      .send({
        content: '你好，介绍一下你自己',
        modelAlias: 'openai-gpt-6-astra',
        temperature: 0.4,
      })
      .expect(200);

    expect(response.headers['content-type']).toContain('text/event-stream');
    expect(response.text).toContain('event: meta');
    expect(response.text).toContain('event: delta');
    expect(response.text).toContain('event: done');
    expect(readEvent(response.text, 'delta')).toMatchObject({ content: '流式' });

    const meta = readEvent(response.text, 'meta') as {
      assistantMessageId: string;
      balance: number;
      conversationId: string;
      requestId: string;
    };
    const done = readEvent(response.text, 'done') as {
      balance: number;
      status: string;
    };

    expect(meta.balance).toBe(99);
    expect(done).toMatchObject({
      balance: 99,
      status: 'COMPLETED',
    });
    expect(lastProviderRequest).toMatchObject({
      model: 'gpt-6-astra',
      temperature: 0.4,
    });
    expect(lastProviderRequest?.messages.at(-1)).toEqual({
      content: '你好，介绍一下你自己',
      role: 'user',
    });

    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    const chatRequest = await prisma.chatRequest.findUniqueOrThrow({
      where: { id: meta.requestId },
    });
    const messages = await prisma.message.findMany({
      orderBy: { createdAt: 'asc' },
      where: { conversationId: meta.conversationId },
    });
    const reservation = await prisma.pointsReservation.findFirstOrThrow({
      where: { referenceId: meta.requestId },
    });

    expect(user.pointsBalance).toBe(99);
    expect(chatRequest).toMatchObject({
      status: 'COMPLETED',
      userId: user.id,
    });
    expect(messages).toHaveLength(2);
    expect(messages[1]).toMatchObject({
      content: '流式回复',
      role: 'ASSISTANT',
      status: 'COMPLETED',
    });
    expect(reservation.status).toBe('SETTLED');

    const duplicateResponse = await request(app.getHttpServer())
      .post('/api/v1/chat/stream')
      .set('authorization', `Bearer ${accessToken}`)
      .set('idempotency-key', idempotencyKey)
      .send({
        content: '重复请求',
        modelAlias: 'openai-gpt-6-astra',
      })
      .expect(409);

    expect(duplicateResponse.body.error.code).toBe('CHAT_REQUEST_ALREADY_EXISTS');
    expect((await prisma.user.findUniqueOrThrow({ where: { email } })).pointsBalance).toBe(99);
  });

  it('marks provider failures and refunds the reserved points', async () => {
    providerMode = 'failure';
    const { accessToken, email } = await registerUser();

    const response = await request(app.getHttpServer())
      .post('/api/v1/chat/stream')
      .set('authorization', `Bearer ${accessToken}`)
      .set('idempotency-key', randomUUID())
      .send({
        content: '触发失败',
        modelAlias: 'openai-gpt-6-astra',
      })
      .expect(200);

    const errorEvent = readEvent(response.text, 'error') as {
      code: string;
      refunded: boolean;
      requestId: string;
    };

    expect(errorEvent).toMatchObject({
      code: 'LLM_UNAVAILABLE',
      refunded: true,
    });

    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    const chatRequest = await prisma.chatRequest.findUniqueOrThrow({
      where: { id: errorEvent.requestId },
    });
    const reservation = await prisma.pointsReservation.findFirstOrThrow({
      where: { referenceId: errorEvent.requestId },
    });
    const ledger = await prisma.pointsLedgerEntry.findMany({
      orderBy: { createdAt: 'asc' },
      where: { userId: user.id },
    });

    expect(user.pointsBalance).toBe(100);
    expect(chatRequest.status).toBe('REFUNDED');
    expect(reservation.status).toBe('REFUNDED');
    expect(ledger.map((entry) => entry.type)).toEqual(['GRANT', 'HOLD', 'REFUND']);
  });

  async function registerUser(): Promise<{ accessToken: string; email: string }> {
    const email = `chat-${randomUUID()}@chat-test.local`;
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/email/register')
      .send({
        displayName: '对话测试用户',
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

function readEvent(body: string, eventName: string): unknown {
  const block = body
    .split('\n\n')
    .find((candidate) => candidate.startsWith(`event: ${eventName}\n`));

  if (!block) {
    throw new Error(`SSE event "${eventName}" was not found`);
  }

  const dataLine = block.split('\n').find((line) => line.startsWith('data: '));

  if (!dataLine) {
    throw new Error(`SSE event "${eventName}" did not contain data`);
  }

  return JSON.parse(dataLine.slice('data: '.length)) as unknown;
}
