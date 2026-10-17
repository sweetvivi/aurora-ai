import { ServiceUnavailableException, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { createHash, randomUUID } from 'node:crypto';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';
import { configureApplication } from '../src/bootstrap/configure-app';
import { PrismaService } from '../src/infrastructure/prisma/prisma.service';
import {
  IMAGE_PROVIDER,
  type GenerateImageInput,
  type ImageProvider,
} from '../src/providers/image-provider';
import {
  STORAGE_ADAPTER,
  type SaveFileInput,
  type StorageAdapter,
} from '../src/storage/storage.types';

const PNG_BUFFER = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);

describe('file uploads and image tasks', () => {
  let app: INestApplication;
  let imageMode: 'failure' | 'success';
  let prisma: PrismaService;
  const storage = new MemoryStorageAdapter();

  const imageProvider: ImageProvider = {
    async generateImage(input: GenerateImageInput) {
      if (imageMode === 'failure') {
        throw new ServiceUnavailableException({
          code: 'IMAGE_PROVIDER_UNAVAILABLE',
          message: 'provider unavailable',
        });
      }

      return {
        buffer: Buffer.concat([PNG_BUFFER, Buffer.from(input.prompt)]),
        extension: 'png',
        mimeType: 'image/png',
      };
    },
  };

  beforeAll(async () => {
    imageMode = 'success';

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(STORAGE_ADAPTER)
      .useValue(storage)
      .overrideProvider(IMAGE_PROVIDER)
      .useValue(imageProvider)
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
          endsWith: '@media-test.local',
        },
      },
    });
    storage.clear();
    await app.close();
  });

  it('uploads an image, calculates its checksum, and isolates it by user', async () => {
    const owner = await registerUser();
    const otherUser = await registerUser();

    const uploadResponse = await request(app.getHttpServer())
      .post('/api/v1/files')
      .set('authorization', `Bearer ${owner.accessToken}`)
      .attach('file', PNG_BUFFER, {
        contentType: 'image/png',
        filename: 'source.png',
      })
      .expect(201);

    expect(uploadResponse.body.data).toMatchObject({
      checksum: createHash('sha256').update(PNG_BUFFER).digest('hex'),
      mimeType: 'image/png',
      originalName: 'source.png',
      size: PNG_BUFFER.length,
    });
    expect(uploadResponse.body.data).not.toHaveProperty('storageKey');

    const fileId = uploadResponse.body.data.id as string;
    const contentResponse = await request(app.getHttpServer())
      .get(`/api/v1/files/${fileId}/content`)
      .set('authorization', `Bearer ${owner.accessToken}`)
      .expect(200);

    expect(contentResponse.headers['content-type']).toContain('image/png');
    expect(Buffer.from(contentResponse.body)).toEqual(PNG_BUFFER);

    const isolatedResponse = await request(app.getHttpServer())
      .get(`/api/v1/files/${fileId}`)
      .set('authorization', `Bearer ${otherUser.accessToken}`)
      .expect(404);

    expect(isolatedResponse.body.error.code).toBe('FILE_NOT_FOUND');
  });

  it('rejects invalid image content and oversized uploads', async () => {
    const { accessToken } = await registerUser();

    const invalidResponse = await request(app.getHttpServer())
      .post('/api/v1/files')
      .set('authorization', `Bearer ${accessToken}`)
      .attach('file', Buffer.from('not-an-image'), {
        contentType: 'image/png',
        filename: 'invalid.png',
      })
      .expect(400);

    expect(invalidResponse.body.error.code).toBe('FILE_CONTENT_MISMATCH');

    const oversizedResponse = await request(app.getHttpServer())
      .post('/api/v1/files')
      .set('authorization', `Bearer ${accessToken}`)
      .attach('file', Buffer.alloc(1_025), {
        contentType: 'image/png',
        filename: 'oversized.png',
      })
      .expect(413);

    expect(oversizedResponse.body.error.code).toBe('FILE_TOO_LARGE');
  });

  it('creates an image task, settles points, and returns the result file', async () => {
    imageMode = 'success';
    const { accessToken, email } = await registerUser();
    const idempotencyKey = randomUUID();

    const createResponse = await request(app.getHttpServer())
      .post('/api/v1/image-tasks')
      .set('authorization', `Bearer ${accessToken}`)
      .set('idempotency-key', idempotencyKey)
      .send({
        parameters: {
          aspectRatio: '1:1',
        },
        prompt: '一张用于测试的抽象图案',
      })
      .expect(202);

    const taskId = createResponse.body.data.id as string;
    const task = await waitForTerminalTask(accessToken, taskId);

    expect(task).toMatchObject({
      id: taskId,
      modelAlias: 'jiguang-gpt-image-2.5',
      status: 'SUCCEEDED',
    });
    expect(task.resultFile).toMatchObject({
      mimeType: 'image/png',
    });
    expect(task).not.toHaveProperty('idempotencyKey');

    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    const reservation = await prisma.pointsReservation.findFirstOrThrow({
      where: {
        referenceId: taskId,
        referenceType: 'image_task',
      },
    });

    expect(user.pointsBalance).toBe(95);
    expect(reservation.status).toBe('SETTLED');

    const resultFileId = task.resultFile?.id;

    expect(resultFileId).toBeTypeOf('string');

    const resultResponse = await request(app.getHttpServer())
      .get(`/api/v1/files/${resultFileId as string}/content`)
      .set('authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(resultResponse.headers['content-type']).toContain('image/png');
    expect(Buffer.from(resultResponse.body).subarray(0, 8)).toEqual(PNG_BUFFER.subarray(0, 8));

    const duplicateResponse = await request(app.getHttpServer())
      .post('/api/v1/image-tasks')
      .set('authorization', `Bearer ${accessToken}`)
      .set('idempotency-key', idempotencyKey)
      .send({
        parameters: {
          aspectRatio: '1:1',
        },
        prompt: '一张用于测试的抽象图案',
      })
      .expect(202);

    expect(duplicateResponse.body.data.id).toBe(taskId);
    expect((await prisma.user.findUniqueOrThrow({ where: { email } })).pointsBalance).toBe(95);
    expect(
      await prisma.pointsReservation.count({
        where: {
          referenceId: taskId,
          referenceType: 'image_task',
        },
      }),
    ).toBe(1);
  });

  it('marks provider failures and refunds the image task points', async () => {
    imageMode = 'failure';
    const { accessToken, email } = await registerUser();

    const createResponse = await request(app.getHttpServer())
      .post('/api/v1/image-tasks')
      .set('authorization', `Bearer ${accessToken}`)
      .set('idempotency-key', randomUUID())
      .send({
        prompt: '触发失败任务',
      })
      .expect(202);

    const task = await waitForTerminalTask(accessToken, createResponse.body.data.id as string);

    expect(task).toMatchObject({
      errorCode: 'IMAGE_PROVIDER_UNAVAILABLE',
      resultFile: null,
      status: 'FAILED',
    });

    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    const reservation = await prisma.pointsReservation.findFirstOrThrow({
      where: {
        referenceId: task.id,
        referenceType: 'image_task',
      },
    });
    const ledger = await prisma.pointsLedgerEntry.findMany({
      orderBy: { createdAt: 'asc' },
      where: { userId: user.id },
    });

    expect(user.pointsBalance).toBe(100);
    expect(reservation.status).toBe('REFUNDED');
    expect(ledger.map((entry) => entry.type)).toEqual(['GRANT', 'HOLD', 'REFUND']);
  });

  async function waitForTerminalTask(
    accessToken: string,
    taskId: string,
  ): Promise<Record<string, unknown> & { id: string; resultFile?: { id: string } | null }> {
    const deadline = Date.now() + 5_000;

    while (Date.now() < deadline) {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/image-tasks/${taskId}`)
        .set('authorization', `Bearer ${accessToken}`)
        .expect(200);
      const task = response.body.data as Record<string, unknown> & {
        id: string;
        resultFile?: { id: string } | null;
        status: string;
      };

      if (task.status === 'SUCCEEDED' || task.status === 'FAILED') {
        return task;
      }

      await new Promise((resolve) => setTimeout(resolve, 20));
    }

    throw new Error(`Image task ${taskId} did not reach a terminal state`);
  }

  async function registerUser(): Promise<{ accessToken: string; email: string }> {
    const email = `media-${randomUUID()}@media-test.local`;
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/email/register')
      .send({
        displayName: '媒体测试用户',
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

class MemoryStorageAdapter implements StorageAdapter {
  private readonly files = new Map<string, Buffer>();

  async save(input: SaveFileInput) {
    const storageKey = `memory/${input.userId}/${randomUUID()}.${input.extension}`;
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
