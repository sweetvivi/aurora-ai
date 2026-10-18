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
const MP4_BUFFER = Buffer.from([
  0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d, 0x00, 0x00, 0x02, 0x00,
  0x69, 0x73, 0x6f, 0x6d, 0x6d, 0x70, 0x34, 0x32,
]);

describe('file uploads and image tasks', () => {
  let app: INestApplication;
  let imageMode: 'failure' | 'success';
  let lastImageInput: GenerateImageInput | undefined;
  let prisma: PrismaService;
  const storage = new MemoryStorageAdapter();

  const imageProvider: ImageProvider = {
    async generateImage(input: GenerateImageInput) {
      lastImageInput = input;

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

  it('uploads a validated video through the dedicated video endpoint', async () => {
    const { accessToken } = await registerUser();

    const uploadResponse = await request(app.getHttpServer())
      .post('/api/v1/files/video')
      .set('authorization', `Bearer ${accessToken}`)
      .attach('file', MP4_BUFFER, {
        contentType: 'video/mp4',
        filename: 'reference.mp4',
      })
      .expect(201);

    expect(uploadResponse.body.data).toMatchObject({
      checksum: createHash('sha256').update(MP4_BUFFER).digest('hex'),
      mimeType: 'video/mp4',
      originalName: 'reference.mp4',
      size: MP4_BUFFER.length,
    });
    expect(uploadResponse.body.data).not.toHaveProperty('storageKey');

    const mismatchedResponse = await request(app.getHttpServer())
      .post('/api/v1/files/video')
      .set('authorization', `Bearer ${accessToken}`)
      .attach('file', Buffer.from('not-an-mp4'), {
        contentType: 'video/mp4',
        filename: 'invalid.mp4',
      })
      .expect(400);

    expect(mismatchedResponse.body.error.code).toBe('FILE_CONTENT_MISMATCH');
  });

  it('creates an image task, settles points, and returns the result file', async () => {
    imageMode = 'success';
    lastImageInput = undefined;
    const { accessToken, email } = await registerUser();
    const idempotencyKey = randomUUID();
    const sourceFileId = await uploadImage(accessToken, 'source.png');
    const backgroundFileId = await uploadImage(accessToken, 'background.png');

    const createResponse = await request(app.getHttpServer())
      .post('/api/v1/image-tasks')
      .set('authorization', `Bearer ${accessToken}`)
      .set('idempotency-key', idempotencyKey)
      .send({
        parameters: {
          aspectRatio: '1:1',
        },
        prompt: '将商品自然融合到目标背景',
        referenceFileIds: [backgroundFileId],
        sourceFileId,
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
    expect(lastImageInput).toMatchObject({
      sourceImages: [{ originalName: 'source.png' }, { originalName: 'background.png' }],
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
        prompt: '将商品自然融合到目标背景',
        referenceFileIds: [backgroundFileId],
        sourceFileId,
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

  it('accepts ten total images and rejects an eleventh input', async () => {
    imageMode = 'success';
    lastImageInput = undefined;
    const { accessToken } = await registerUser();
    const sourceFileId = await uploadImage(accessToken, 'source.png');
    const referenceFileIds = await Promise.all(
      Array.from({ length: 10 }, (_, index) =>
        uploadImage(accessToken, `reference-${index + 1}.png`),
      ),
    );

    const createResponse = await request(app.getHttpServer())
      .post('/api/v1/image-tasks')
      .set('authorization', `Bearer ${accessToken}`)
      .set('idempotency-key', randomUUID())
      .send({
        prompt: '组合十张输入图片',
        referenceFileIds: referenceFileIds.slice(0, 9),
        sourceFileId,
      })
      .expect(202);

    const task = await waitForTerminalTask(accessToken, createResponse.body.data.id as string);

    expect(task.status).toBe('SUCCEEDED');
    const observedInput = lastImageInput as GenerateImageInput | undefined;

    expect(observedInput?.sourceImages).toHaveLength(10);

    const rejectedResponse = await request(app.getHttpServer())
      .post('/api/v1/image-tasks')
      .set('authorization', `Bearer ${accessToken}`)
      .set('idempotency-key', randomUUID())
      .send({
        prompt: '超过输入图片上限',
        referenceFileIds,
        sourceFileId,
      })
      .expect(409);

    expect(rejectedResponse.body.error.code).toBe('IMAGE_REFERENCE_LIMIT_EXCEEDED');
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

  it('rejects reference images that belong to another user', async () => {
    const owner = await registerUser();
    const otherUser = await registerUser();
    const sourceFileId = await uploadImage(owner.accessToken, 'source.png');
    const otherUserFileId = await uploadImage(otherUser.accessToken, 'private.png');

    const response = await request(app.getHttpServer())
      .post('/api/v1/image-tasks')
      .set('authorization', `Bearer ${owner.accessToken}`)
      .set('idempotency-key', randomUUID())
      .send({
        prompt: '不应读取其他用户文件',
        referenceFileIds: [otherUserFileId],
        sourceFileId,
      })
      .expect(404);

    expect(response.body.error.code).toBe('FILE_NOT_FOUND');
  });

  it('ignores reference file ids injected through freeform parameters', async () => {
    imageMode = 'success';
    lastImageInput = undefined;
    const owner = await registerUser();
    const otherUser = await registerUser();
    const sourceFileId = await uploadImage(owner.accessToken, 'source.png');
    const otherUserFileId = await uploadImage(otherUser.accessToken, 'private.png');

    const response = await request(app.getHttpServer())
      .post('/api/v1/image-tasks')
      .set('authorization', `Bearer ${owner.accessToken}`)
      .set('idempotency-key', randomUUID())
      .send({
        parameters: {
          aspectRatio: '1:1',
          referenceFileIds: [otherUserFileId],
        },
        prompt: '只处理主图片',
        sourceFileId,
      })
      .expect(202);

    const task = await waitForTerminalTask(owner.accessToken, response.body.data.id);

    expect(task.status).toBe('SUCCEEDED');
    const observedInput = lastImageInput as GenerateImageInput | undefined;

    expect(observedInput?.sourceImages).toEqual([
      expect.objectContaining({ originalName: 'source.png' }),
    ]);
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
