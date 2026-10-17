import { ServiceUnavailableException, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { createHash, randomUUID } from 'node:crypto';
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
import {
  STORAGE_ADAPTER,
  type SaveFileInput,
  type StorageAdapter,
} from '../src/storage/storage.types';

const PNG_BUFFER = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);

describe('chat and conversation endpoints', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let providerMode: 'failure' | 'success';
  let lastProviderRequest: StreamChatRequest | null;
  const storage = new MemoryStorageAdapter();

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
      .overrideProvider(STORAGE_ADAPTER)
      .useValue(storage)
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
    storage.clear();
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
          capabilities: ['chat', 'vision'],
          displayName: 'GPT-6 Astra',
        }),
        expect.objectContaining({
          alias: 'openai-gpt-6-sol',
          capabilities: ['chat', 'vision'],
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

  it('sends an owned image attachment and restores it from conversation history', async () => {
    providerMode = 'success';
    lastProviderRequest = null;
    const { accessToken } = await registerUser();
    const fileId = await uploadImage(accessToken, 'reference.png');
    const idempotencyKey = randomUUID();

    const response = await request(app.getHttpServer())
      .post('/api/v1/chat/stream')
      .set('authorization', `Bearer ${accessToken}`)
      .set('idempotency-key', idempotencyKey)
      .send({
        content: '请描述这张图片',
        fileIds: [fileId],
        modelAlias: 'openai-gpt-6-astra',
      })
      .expect(200);

    const meta = readEvent(response.text, 'meta') as {
      conversationId: string;
      requestId: string;
    };

    const firstProviderRequest = lastProviderRequest as StreamChatRequest | null;

    expect(firstProviderRequest?.messages.at(-1)).toMatchObject({
      content: [
        {
          text: '请描述这张图片',
          type: 'text',
        },
        {
          image_url: {
            url: expect.stringMatching(/^data:image\/png;base64,/),
          },
          type: 'image_url',
        },
      ],
      role: 'user',
    });

    const persistedMessage = await prisma.message.findFirstOrThrow({
      include: {
        attachments: true,
      },
      where: {
        requestId: meta.requestId,
        role: 'USER',
      },
    });

    expect(persistedMessage.attachments).toHaveLength(1);
    expect(persistedMessage.attachments[0]).toMatchObject({
      fileId,
      sortOrder: 0,
    });

    const detailResponse = await request(app.getHttpServer())
      .get(`/api/v1/conversations/${meta.conversationId}`)
      .set('authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(detailResponse.body.data.messages[0].attachments[0]).toMatchObject({
      file: {
        id: fileId,
        mimeType: 'image/png',
        originalName: 'reference.png',
      },
      fileId,
      sortOrder: 0,
    });

    await request(app.getHttpServer())
      .post('/api/v1/chat/stream')
      .set('authorization', `Bearer ${accessToken}`)
      .set('idempotency-key', randomUUID())
      .send({
        content: '再概括一下',
        conversationId: meta.conversationId,
        modelAlias: 'openai-gpt-6-astra',
      })
      .expect(200);

    const secondProviderRequest = lastProviderRequest as StreamChatRequest | null;
    const historicalImageMessage = secondProviderRequest?.messages.find(
      (message) =>
        Array.isArray(message.content) && message.content.some((part) => part.type === 'image_url'),
    );

    expect(historicalImageMessage).toMatchObject({
      content: [
        {
          text: '请描述这张图片',
          type: 'text',
        },
        {
          type: 'image_url',
        },
      ],
      role: 'user',
    });
  });

  it('rejects missing, unavailable, or foreign attachments before reserving points', async () => {
    const owner = await registerUser();
    const otherUser = await registerUser();
    const fileId = await uploadImage(owner.accessToken, 'owner.png');

    const foreignResponse = await request(app.getHttpServer())
      .post('/api/v1/chat/stream')
      .set('authorization', `Bearer ${otherUser.accessToken}`)
      .set('idempotency-key', randomUUID())
      .send({
        content: '分析图片',
        fileIds: [fileId],
        modelAlias: 'openai-gpt-6-astra',
      })
      .expect(404);

    expect(foreignResponse.body.error.code).toBe('FILE_NOT_FOUND');

    await prisma.fileAsset.update({
      data: {
        status: 'DELETED',
      },
      where: {
        id: fileId,
      },
    });

    const unavailableResponse = await request(app.getHttpServer())
      .post('/api/v1/chat/stream')
      .set('authorization', `Bearer ${owner.accessToken}`)
      .set('idempotency-key', randomUUID())
      .send({
        content: '分析图片',
        fileIds: [fileId],
        modelAlias: 'openai-gpt-6-astra',
      })
      .expect(404);

    expect(unavailableResponse.body.error.code).toBe('FILE_NOT_FOUND');

    const missingResponse = await request(app.getHttpServer())
      .post('/api/v1/chat/stream')
      .set('authorization', `Bearer ${owner.accessToken}`)
      .set('idempotency-key', randomUUID())
      .send({
        content: '分析图片',
        fileIds: [randomUUID()],
        modelAlias: 'openai-gpt-6-astra',
      })
      .expect(404);

    expect(missingResponse.body.error.code).toBe('FILE_NOT_FOUND');

    const ownerRecord = await prisma.user.findUniqueOrThrow({
      where: {
        email: owner.email,
      },
    });
    const otherRecord = await prisma.user.findUniqueOrThrow({
      where: {
        email: otherUser.email,
      },
    });

    expect(ownerRecord.pointsBalance).toBe(100);
    expect(otherRecord.pointsBalance).toBe(100);
    expect(
      await prisma.chatRequest.count({
        where: {
          userId: {
            in: [ownerRecord.id, otherRecord.id],
          },
        },
      }),
    ).toBe(0);
  });

  it('rejects image attachments for non-vision models and more than three files', async () => {
    const { accessToken, email } = await registerUser();
    const fileId = await uploadImage(accessToken, 'reference.png');

    const nonVisionResponse = await request(app.getHttpServer())
      .post('/api/v1/chat/stream')
      .set('authorization', `Bearer ${accessToken}`)
      .set('idempotency-key', randomUUID())
      .send({
        content: '分析图片',
        fileIds: [fileId],
        modelAlias: 'deepseek-v4-pro-0813',
      })
      .expect(409);

    expect(nonVisionResponse.body.error.code).toBe('CHAT_MODEL_VISION_UNSUPPORTED');

    const limitResponse = await request(app.getHttpServer())
      .post('/api/v1/chat/stream')
      .set('authorization', `Bearer ${accessToken}`)
      .set('idempotency-key', randomUUID())
      .send({
        content: '分析图片',
        fileIds: [randomUUID(), randomUUID(), randomUUID(), randomUUID()],
        modelAlias: 'openai-gpt-6-astra',
      })
      .expect(400);

    expect(limitResponse.body.error.code).toBe('BAD_REQUEST');

    const user = await prisma.user.findUniqueOrThrow({
      where: {
        email,
      },
    });

    expect(user.pointsBalance).toBe(100);
    expect(
      await prisma.chatRequest.count({
        where: {
          userId: user.id,
        },
      }),
    ).toBe(0);
  });

  it('keeps attachment history consistent when the provider fails', async () => {
    providerMode = 'failure';
    const { accessToken, email } = await registerUser();
    const fileId = await uploadImage(accessToken, 'failure.png');

    const response = await request(app.getHttpServer())
      .post('/api/v1/chat/stream')
      .set('authorization', `Bearer ${accessToken}`)
      .set('idempotency-key', randomUUID())
      .send({
        content: '这张图是什么',
        fileIds: [fileId],
        modelAlias: 'openai-gpt-6-astra',
      })
      .expect(200);

    const errorEvent = readEvent(response.text, 'error') as {
      requestId: string;
    };
    const requestRecord = await prisma.chatRequest.findUniqueOrThrow({
      where: {
        id: errorEvent.requestId,
      },
    });
    const userMessage = await prisma.message.findFirstOrThrow({
      include: {
        attachments: true,
      },
      where: {
        requestId: errorEvent.requestId,
        role: 'USER',
      },
    });
    const assistantMessage = await prisma.message.findFirstOrThrow({
      where: {
        requestId: errorEvent.requestId,
        role: 'ASSISTANT',
      },
    });
    const user = await prisma.user.findUniqueOrThrow({
      where: {
        email,
      },
    });

    expect(requestRecord.status).toBe('REFUNDED');
    expect(user.pointsBalance).toBe(100);
    expect(userMessage.attachments).toHaveLength(1);
    expect(userMessage.attachments[0]?.fileId).toBe(fileId);
    expect(assistantMessage.status).toBe('FAILED');
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

  async function uploadImage(accessToken: string, filename: string): Promise<string> {
    const response = await request(app.getHttpServer())
      .post('/api/v1/files')
      .set('authorization', `Bearer ${accessToken}`)
      .attach('file', PNG_BUFFER, {
        contentType: 'image/png',
        filename,
      })
      .expect(201);

    return response.body.data.id as string;
  }
});

class MemoryStorageAdapter implements StorageAdapter {
  private readonly files = new Map<string, Buffer>();

  async save(input: SaveFileInput) {
    const storageKey = `chat-test/${input.userId}/${randomUUID()}.${input.extension}`;
    const buffer = Buffer.from(input.buffer);

    this.files.set(storageKey, buffer);

    return {
      checksum: createHash('sha256').update(buffer).digest('hex'),
      size: buffer.length,
      storageKey,
    };
  }

  async read(storageKey: string): Promise<Buffer> {
    const buffer = this.files.get(storageKey);

    if (!buffer) {
      throw new Error(`Missing memory file: ${storageKey}`);
    }

    return Buffer.from(buffer);
  }

  async delete(storageKey: string): Promise<void> {
    this.files.delete(storageKey);
  }

  clear(): void {
    this.files.clear();
  }
}

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
