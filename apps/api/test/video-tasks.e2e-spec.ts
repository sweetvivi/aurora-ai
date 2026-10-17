import { ServiceUnavailableException, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { createHash, randomUUID } from 'node:crypto';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';
import { configureApplication } from '../src/bootstrap/configure-app';
import { PrismaService } from '../src/infrastructure/prisma/prisma.service';
import {
  VIDEO_PROVIDER,
  type GenerateVideoInput,
  type VideoGenerationSnapshot,
  type VideoProvider,
} from '../src/providers/video-provider';
import {
  STORAGE_ADAPTER,
  type SaveFileInput,
  type StorageAdapter,
} from '../src/storage/storage.types';

const PNG_BUFFER = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);
const VIDEO_BUFFER = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>');

describe('video tasks', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const storage = new MemoryStorageAdapter();
  let providerMode: 'failure' | 'hold' | 'success';

  const videoProvider: VideoProvider = {
    supportsLastFrame: false,
    async createGeneration(input: GenerateVideoInput) {
      if (providerMode === 'failure') {
        throw new ServiceUnavailableException({
          code: 'VIDEO_PROVIDER_UNAVAILABLE',
          message: 'provider unavailable',
        });
      }

      return {
        progress: providerMode === 'success' ? 100 : 8,
        requestId: `provider-${randomUUID()}`,
        result:
          providerMode === 'success'
            ? {
                buffer: Buffer.concat([VIDEO_BUFFER, Buffer.from(input.prompt)]),
                extension: 'svg',
                mimeType: 'image/svg+xml',
              }
            : undefined,
        status: providerMode === 'success' ? 'SUCCEEDED' : 'PROCESSING',
      };
    },
    async pollGeneration(requestId: string): Promise<VideoGenerationSnapshot> {
      return {
        progress: providerMode === 'hold' ? 42 : 100,
        requestId,
        result:
          providerMode === 'hold'
            ? undefined
            : {
                buffer: VIDEO_BUFFER,
                extension: 'svg',
                mimeType: 'image/svg+xml',
              },
        status: providerMode === 'hold' ? 'PROCESSING' : 'SUCCEEDED',
      };
    },
  };

  beforeAll(async () => {
    providerMode = 'success';

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(STORAGE_ADAPTER)
      .useValue(storage)
      .overrideProvider(VIDEO_PROVIDER)
      .useValue(videoProvider)
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
          endsWith: '@video-test.local',
        },
      },
    });
    storage.clear();
    await app.close();
  });

  it('creates a video task, settles points, and returns an idempotent result', async () => {
    providerMode = 'success';
    const { accessToken, email } = await registerUser();
    const idempotencyKey = randomUUID();
    const payload = {
      modelAlias: 'xai-grok-imagine-video',
      parameters: {
        duration: 5,
        ratio: '16:9',
        resolution: '720p',
      },
      prompt: '镜头缓慢推进，冰湖上出现极光',
    };

    const createResponse = await request(app.getHttpServer())
      .post('/api/v1/video-tasks')
      .set('authorization', `Bearer ${accessToken}`)
      .set('idempotency-key', idempotencyKey)
      .send(payload)
      .expect(202);

    const taskId = createResponse.body.data.id as string;
    const task = await waitForTerminalTask(accessToken, taskId);

    expect(task).toMatchObject({
      id: taskId,
      modelAlias: 'xai-grok-imagine-video',
      progress: 100,
      status: 'SUCCEEDED',
    });
    expect(task.resultFile).toMatchObject({
      mimeType: 'image/svg+xml',
    });
    expect(task).not.toHaveProperty('idempotencyKey');
    expect(task).not.toHaveProperty('providerRequestId');

    const resultFileId = task.resultFile?.id;

    expect(resultFileId).toBeTypeOf('string');

    const resultResponse = await request(app.getHttpServer())
      .get(`/api/v1/files/${resultFileId as string}/content`)
      .set('authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(resultResponse.headers['content-type']).toContain('image/svg+xml');
    expect(Buffer.from(resultResponse.body).subarray(0, 4)).toEqual(VIDEO_BUFFER.subarray(0, 4));

    const duplicateResponse = await request(app.getHttpServer())
      .post('/api/v1/video-tasks')
      .set('authorization', `Bearer ${accessToken}`)
      .set('idempotency-key', idempotencyKey)
      .send(payload)
      .expect(202);

    expect(duplicateResponse.body.data.id).toBe(taskId);

    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    const reservation = await prisma.pointsReservation.findFirstOrThrow({
      where: {
        referenceId: taskId,
        referenceType: 'video_task',
      },
    });

    expect(user.pointsBalance).toBe(90);
    expect(reservation.status).toBe('SETTLED');
    expect(
      await prisma.pointsReservation.count({
        where: {
          referenceId: taskId,
          referenceType: 'video_task',
        },
      }),
    ).toBe(1);
  });

  it('refunds points when the video provider fails', async () => {
    providerMode = 'failure';
    const { accessToken, email } = await registerUser();

    const createResponse = await request(app.getHttpServer())
      .post('/api/v1/video-tasks')
      .set('authorization', `Bearer ${accessToken}`)
      .set('idempotency-key', randomUUID())
      .send({
        prompt: '触发视频失败任务',
      })
      .expect(202);

    const task = await waitForTerminalTask(accessToken, createResponse.body.data.id as string);

    expect(task).toMatchObject({
      errorCode: 'VIDEO_PROVIDER_UNAVAILABLE',
      resultFile: null,
      status: 'FAILED',
    });

    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    const reservation = await prisma.pointsReservation.findFirstOrThrow({
      where: {
        referenceId: task.id,
        referenceType: 'video_task',
      },
    });

    expect(user.pointsBalance).toBe(100);
    expect(reservation.status).toBe('REFUNDED');
  });

  it('cancels a running video task and refunds its points', async () => {
    providerMode = 'hold';
    const { accessToken, email } = await registerUser();

    const createResponse = await request(app.getHttpServer())
      .post('/api/v1/video-tasks')
      .set('authorization', `Bearer ${accessToken}`)
      .set('idempotency-key', randomUUID())
      .send({
        prompt: '保持处理中的视频任务',
      })
      .expect(202);

    const taskId = createResponse.body.data.id as string;

    await waitForStatus(accessToken, taskId, 'RUNNING');

    const cancelResponse = await request(app.getHttpServer())
      .post(`/api/v1/video-tasks/${taskId}/cancel`)
      .set('authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(cancelResponse.body.data).toMatchObject({
      errorCode: 'VIDEO_TASK_CANCELLED',
      status: 'CANCELLED',
    });

    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    const reservation = await prisma.pointsReservation.findFirstOrThrow({
      where: {
        referenceId: taskId,
        referenceType: 'video_task',
      },
    });

    expect(user.pointsBalance).toBe(100);
    expect(reservation.status).toBe('REFUNDED');
  });

  it('rejects a last-frame request when the active provider does not support it', async () => {
    providerMode = 'success';
    const { accessToken } = await registerUser();
    const sourceFileId = await uploadFrame(accessToken, 'source.png');
    const lastFrameFileId = await uploadFrame(accessToken, 'last.png');

    const response = await request(app.getHttpServer())
      .post('/api/v1/video-tasks')
      .set('authorization', `Bearer ${accessToken}`)
      .set('idempotency-key', randomUUID())
      .send({
        lastFrameFileId,
        prompt: '首尾帧不支持测试',
        sourceFileId,
      })
      .expect(409);

    expect(response.body.error.code).toBe('VIDEO_LAST_FRAME_UNSUPPORTED');
  });

  async function uploadFrame(accessToken: string, filename: string): Promise<string> {
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

  async function waitForTerminalTask(
    accessToken: string,
    taskId: string,
  ): Promise<Record<string, unknown> & { id: string; resultFile?: { id: string } | null }> {
    const deadline = Date.now() + 5_000;

    while (Date.now() < deadline) {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/video-tasks/${taskId}`)
        .set('authorization', `Bearer ${accessToken}`)
        .expect(200);
      const task = response.body.data as Record<string, unknown> & {
        id: string;
        resultFile?: { id: string } | null;
        status: string;
      };

      if (['CANCELLED', 'FAILED', 'SUCCEEDED'].includes(task.status)) {
        return task;
      }

      await new Promise((resolve) => setTimeout(resolve, 20));
    }

    throw new Error(`Video task ${taskId} did not reach a terminal state`);
  }

  async function waitForStatus(
    accessToken: string,
    taskId: string,
    expectedStatus: string,
  ): Promise<void> {
    const deadline = Date.now() + 5_000;

    while (Date.now() < deadline) {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/video-tasks/${taskId}`)
        .set('authorization', `Bearer ${accessToken}`)
        .expect(200);

      if (response.body.data.status === expectedStatus) {
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 20));
    }

    throw new Error(`Video task ${taskId} did not reach status ${expectedStatus}`);
  }

  async function registerUser(): Promise<{ accessToken: string; email: string }> {
    const email = `video-${randomUUID()}@video-test.local`;
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/email/register')
      .send({
        displayName: '视频测试用户',
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
