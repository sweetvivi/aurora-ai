import {
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import type { FileAsset, VideoTask } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { FilesService } from '../files/files.service';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import { ModelRegistryService } from '../models/model-registry.service';
import { PointsService } from '../points/points.service';
import { STORAGE_ADAPTER, type StorageAdapter } from '../storage/storage.types';
import {
  VIDEO_PROVIDER,
  type GeneratedVideo,
  type VideoProvider,
  type VideoGenerationSnapshot,
} from '../providers/video-provider';
import type { CreateVideoTaskDto } from './dto/create-video-task.dto';

const MAX_IDEMPOTENCY_KEY_LENGTH = 128;
const POLL_PROGRESS_STEP = 4;

type VideoTaskWithFiles = Prisma.VideoTaskGetPayload<{
  include: {
    lastFrameFile: true;
    resultFile: true;
    sourceFile: true;
  };
}>;

@Injectable()
export class VideoTasksService implements OnModuleInit {
  private readonly logger = new Logger(VideoTasksService.name);
  private readonly processingTaskIds = new Set<string>();

  constructor(
    private readonly configService: ConfigService,
    private readonly filesService: FilesService,
    private readonly modelRegistryService: ModelRegistryService,
    private readonly pointsService: PointsService,
    private readonly prismaService: PrismaService,
    @Inject(STORAGE_ADAPTER) private readonly storageAdapter: StorageAdapter,
    @Inject(VIDEO_PROVIDER) private readonly videoProvider: VideoProvider,
  ) {}

  async onModuleInit(): Promise<void> {
    const interruptedTasks = await this.prismaService.videoTask.findMany({
      select: {
        id: true,
        providerRequestId: true,
        userId: true,
      },
      where: { status: 'RUNNING' },
    });

    for (const task of interruptedTasks) {
      if (task.providerRequestId) {
        this.schedule(task.id, true);
      } else {
        await this.markFailed(task.id, task.userId, {
          code: 'VIDEO_WORKER_RESTARTED',
          message: '视频任务因服务重启中断，本次积分已退回',
        });
      }
    }

    const queuedTasks = await this.prismaService.videoTask.findMany({
      orderBy: { createdAt: 'asc' },
      select: { id: true },
      where: { status: 'QUEUED' },
    });

    for (const task of queuedTasks) {
      this.schedule(task.id);
    }
  }

  async create(userId: string, input: CreateVideoTaskDto, rawIdempotencyKey: string | undefined) {
    const idempotencyKey = this.normalizeIdempotencyKey(userId, rawIdempotencyKey);
    const prompt = input.prompt.trim();

    if (!prompt) {
      throw new ConflictException({
        code: 'VIDEO_PROMPT_REQUIRED',
        message: '视频描述不能为空',
      });
    }

    const model = input.modelAlias
      ? this.modelRegistryService.getByAlias(input.modelAlias)
      : this.modelRegistryService.getDefaultVideoModel();

    if (!model.capabilities.includes('video')) {
      throw new ConflictException({
        code: 'VIDEO_MODEL_NOT_FOUND',
        message: '所选模型不支持视频生成',
      });
    }

    if (input.sourceFileId) {
      await this.filesService.getOwnedAsset(userId, input.sourceFileId);
    }

    if (input.lastFrameFileId) {
      if (!input.sourceFileId) {
        throw new ConflictException({
          code: 'VIDEO_SOURCE_FRAME_REQUIRED',
          message: '首尾帧模式需要同时提供首帧和尾帧图片',
        });
      }

      await this.filesService.getOwnedAsset(userId, input.lastFrameFileId);

      const supportsLastFrame =
        this.videoProvider.supportsLastFrameFor?.({
          model: model.providerModel,
          providerBaseUrl: model.baseUrl,
          providerCode: model.providerCode,
        }) ?? this.videoProvider.supportsLastFrame !== false;

      if (!supportsLastFrame) {
        throw new ConflictException({
          code: 'VIDEO_LAST_FRAME_UNSUPPORTED',
          message: '当前视频模型暂不支持首尾帧模式，请切换为文生视频或图生视频',
        });
      }
    }

    const existing = await this.prismaService.videoTask.findUnique({
      where: { idempotencyKey },
    });

    if (existing) {
      this.assertMatchingTask(existing, input, model.alias, prompt);
      this.schedule(existing.id, existing.status === 'RUNNING');

      return this.getTask(userId, existing.id);
    }

    const taskId = randomUUID();
    const pointsCost = this.configService.get<number>('VIDEO_TASK_POINTS_COST', 10);

    try {
      await this.prismaService.videoTask.create({
        data: {
          id: taskId,
          idempotencyKey,
          lastFrameFileId: input.lastFrameFileId,
          modelAlias: model.alias,
          parameters: input.parameters as Prisma.InputJsonValue | undefined,
          prompt,
          sourceFileId: input.sourceFileId,
          userId,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const concurrent = await this.prismaService.videoTask.findUniqueOrThrow({
          where: { idempotencyKey },
        });
        this.assertMatchingTask(concurrent, input, model.alias, prompt);
        this.schedule(concurrent.id, concurrent.status === 'RUNNING');

        return this.getTask(userId, concurrent.id);
      }

      throw error;
    }

    try {
      await this.pointsService.reserve({
        amount: pointsCost,
        idempotencyKey: `video-hold:${idempotencyKey}`,
        referenceId: taskId,
        referenceType: 'video_task',
        userId,
      });
    } catch (error) {
      await this.markFailed(taskId, userId, this.classifyError(error), false);
      throw error;
    }

    this.schedule(taskId);

    return this.getTask(userId, taskId);
  }

  async list(userId: string, limit: number) {
    const tasks = await this.prismaService.videoTask.findMany({
      include: {
        lastFrameFile: true,
        resultFile: true,
        sourceFile: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      where: { userId },
    });

    return {
      items: tasks.map((task) => this.toTaskDto(task)),
    };
  }

  async getTask(
    userId: string,
    taskId: string,
  ): Promise<ReturnType<VideoTasksService['toTaskDto']>> {
    const task = await this.prismaService.videoTask.findFirst({
      include: {
        lastFrameFile: true,
        resultFile: true,
        sourceFile: true,
      },
      where: {
        id: taskId,
        userId,
      },
    });

    if (!task) {
      throw new NotFoundException({
        code: 'VIDEO_TASK_NOT_FOUND',
        message: '视频任务不存在或无权访问',
      });
    }

    return this.toTaskDto(task);
  }

  async cancel(userId: string, taskId: string) {
    const task = await this.prismaService.videoTask.findFirst({
      where: {
        id: taskId,
        userId,
      },
    });

    if (!task) {
      throw new NotFoundException({
        code: 'VIDEO_TASK_NOT_FOUND',
        message: '视频任务不存在或无权访问',
      });
    }

    if (task.status === 'QUEUED' || task.status === 'RUNNING') {
      await this.prismaService.$transaction(async (transaction) => {
        const updated = await transaction.videoTask.updateMany({
          data: {
            completedAt: new Date(),
            errorCode: 'VIDEO_TASK_CANCELLED',
            errorMessage: '视频任务已取消，本次积分已退回',
            status: 'CANCELLED',
          },
          where: {
            id: task.id,
            status: {
              in: ['QUEUED', 'RUNNING'],
            },
            userId,
          },
        });

        if (updated.count !== 1) {
          return;
        }

        const reservation = await transaction.pointsReservation.findFirst({
          where: {
            referenceId: task.id,
            referenceType: 'video_task',
            userId,
          },
        });

        if (reservation?.status === 'RESERVED') {
          await this.pointsService.refundInTransaction(transaction, reservation.id);
        }
      });
    }

    return this.getTask(userId, taskId);
  }

  private schedule(taskId: string, resume = false): void {
    if (this.processingTaskIds.has(taskId)) {
      return;
    }

    this.processingTaskIds.add(taskId);
    const timer = setTimeout(() => {
      void this.process(taskId, resume).finally(() => {
        this.processingTaskIds.delete(taskId);
      });
    }, 0);
    timer.unref();
  }

  private async process(taskId: string, resume = false): Promise<void> {
    if (!resume) {
      const claimed = await this.prismaService.videoTask.updateMany({
        data: {
          progress: 1,
          startedAt: new Date(),
          status: 'RUNNING',
        },
        where: {
          id: taskId,
          status: 'QUEUED',
        },
      });

      if (claimed.count !== 1) {
        return;
      }
    }

    const task = await this.prismaService.videoTask.findUnique({
      include: {
        lastFrameFile: true,
        sourceFile: true,
      },
      where: { id: taskId },
    });

    if (!task || !['QUEUED', 'RUNNING'].includes(task.status)) {
      return;
    }

    const model = this.modelRegistryService.getByAlias(task.modelAlias);
    let providerRequestId = task.providerRequestId ?? undefined;

    try {
      if (!providerRequestId) {
        const created = await this.videoProvider.createGeneration({
          lastFrameImage: task.lastFrameFile
            ? {
                buffer: await this.storageAdapter.read(task.lastFrameFile.storageKey),
                mimeType: task.lastFrameFile.mimeType,
                originalName: task.lastFrameFile.originalName,
              }
            : undefined,
          model: model.providerModel,
          parameters: this.toRecord(task.parameters),
          providerBaseUrl: model.baseUrl,
          providerCode: model.providerCode,
          providerKeyRef: model.keyRef,
          prompt: task.prompt,
          sourceImage: task.sourceFile
            ? {
                buffer: await this.storageAdapter.read(task.sourceFile.storageKey),
                mimeType: task.sourceFile.mimeType,
                originalName: task.sourceFile.originalName,
              }
            : undefined,
        });

        providerRequestId = created.requestId;
        await this.updateProviderProgress(taskId, created);

        if (created.status === 'SUCCEEDED' && created.result) {
          await this.complete(task.id, task.userId, created.result);
          return;
        }

        if (created.status === 'FAILED') {
          throw this.createVideoError(
            created.errorCode ?? 'VIDEO_GENERATION_FAILED',
            created.errorMessage ?? '视频生成失败，请重试',
          );
        }
      }

      const deadline =
        Date.now() + this.configService.get<number>('VIDEO_MAX_POLL_DURATION_MS', 900_000);
      let progress = task.progress;

      while (Date.now() < deadline) {
        const current = await this.prismaService.videoTask.findUnique({
          select: { status: true },
          where: { id: task.id },
        });

        if (current?.status !== 'RUNNING') {
          return;
        }

        const snapshot = await this.videoProvider.pollGeneration(providerRequestId, {
          model: model.providerModel,
          providerBaseUrl: model.baseUrl,
          providerCode: model.providerCode,
          providerKeyRef: model.keyRef,
        });
        progress = Math.max(progress, snapshot.progress);

        await this.prismaService.videoTask.updateMany({
          data: {
            progress: Math.max(snapshot.progress, progress),
          },
          where: {
            id: task.id,
            status: 'RUNNING',
          },
        });

        if (snapshot.status === 'SUCCEEDED' && snapshot.result) {
          await this.complete(task.id, task.userId, snapshot.result);
          return;
        }

        if (snapshot.status === 'FAILED') {
          throw this.createVideoError(
            snapshot.errorCode ?? 'VIDEO_GENERATION_FAILED',
            snapshot.errorMessage ?? '视频生成失败，请重试',
          );
        }

        await this.waitForNextPoll(this.configService.get<number>('VIDEO_POLL_INTERVAL_MS', 2_000));
      }

      throw this.createVideoError('VIDEO_TIMEOUT', '视频生成超时，本次积分已退回');
    } catch (error) {
      const classified = this.classifyError(error);
      this.logger.warn(`Video task ${task.id} failed: ${classified.code}`);
      await this.markFailed(task.id, task.userId, classified);
    }
  }

  private async updateProviderProgress(
    taskId: string,
    snapshot: VideoGenerationSnapshot,
  ): Promise<void> {
    await this.prismaService.videoTask.updateMany({
      data: {
        progress: Math.max(1, snapshot.progress, POLL_PROGRESS_STEP),
        providerRequestId: snapshot.requestId,
      },
      where: {
        id: taskId,
        status: 'RUNNING',
      },
    });
  }

  private async complete(taskId: string, userId: string, generated: GeneratedVideo): Promise<void> {
    if (!Buffer.isBuffer(generated.buffer) || generated.buffer.length === 0) {
      throw this.createVideoError(
        'VIDEO_PROVIDER_INVALID_RESULT',
        '视频生成服务返回了空结果，请重试',
      );
    }

    const stored = await this.storageAdapter.save({
      buffer: generated.buffer,
      extension: generated.extension,
      mimeType: generated.mimeType,
      originalName: `${taskId}.${generated.extension}`,
      userId,
    });
    let resultStorageKey: string | undefined = stored.storageKey;

    try {
      const resultFile = await this.prismaService.$transaction(async (transaction) => {
        const fileAsset = await transaction.fileAsset.create({
          data: {
            checksum: stored.checksum,
            mimeType: generated.mimeType,
            originalName: `${taskId}.${generated.extension}`,
            size: stored.size,
            storageKey: stored.storageKey,
            userId,
          },
        });
        const updated = await transaction.videoTask.updateMany({
          data: {
            completedAt: new Date(),
            progress: 100,
            resultFileId: fileAsset.id,
            status: 'SUCCEEDED',
          },
          where: {
            id: taskId,
            status: 'RUNNING',
          },
        });

        if (updated.count !== 1) {
          throw new ConflictException({
            code: 'VIDEO_TASK_STATE_CONFLICT',
            message: '视频任务状态已发生变化',
          });
        }

        const reservation = await transaction.pointsReservation.findFirst({
          where: {
            referenceId: taskId,
            referenceType: 'video_task',
            userId,
          },
        });

        if (!reservation) {
          throw new ConflictException({
            code: 'VIDEO_TASK_POINTS_NOT_RESERVED',
            message: '视频任务积分冻结记录不存在',
          });
        }

        await this.pointsService.settleInTransaction(transaction, reservation.id);

        return fileAsset;
      });

      resultStorageKey = undefined;
      this.logger.log(`Video task ${taskId} completed with file ${resultFile.id}`);
    } finally {
      if (resultStorageKey) {
        await this.storageAdapter.delete(resultStorageKey).catch(() => undefined);
      }
    }
  }

  private async markFailed(
    taskId: string,
    userId: string,
    error: { code: string; message: string },
    refundReservation = true,
  ): Promise<void> {
    await this.prismaService.$transaction(async (transaction) => {
      const updated = await transaction.videoTask.updateMany({
        data: {
          completedAt: new Date(),
          errorCode: error.code,
          errorMessage: error.message,
          status: 'FAILED',
        },
        where: {
          id: taskId,
          userId,
          status: {
            in: ['QUEUED', 'RUNNING'],
          },
        },
      });

      if (!refundReservation || updated.count !== 1) {
        return;
      }

      const reservation = await transaction.pointsReservation.findFirst({
        where: {
          referenceId: taskId,
          referenceType: 'video_task',
          userId,
        },
      });

      if (reservation?.status === 'RESERVED') {
        await this.pointsService.refundInTransaction(transaction, reservation.id);
      }
    });
  }

  private assertMatchingTask(
    task: VideoTask,
    input: CreateVideoTaskDto,
    modelAlias: string,
    prompt: string,
  ): void {
    const parametersMatch = isDeepStrictEqual(task.parameters ?? null, input.parameters ?? null);

    if (
      task.modelAlias !== modelAlias ||
      task.prompt !== prompt ||
      task.sourceFileId !== (input.sourceFileId ?? null) ||
      task.lastFrameFileId !== (input.lastFrameFileId ?? null) ||
      !parametersMatch
    ) {
      throw new ConflictException({
        code: 'IDEMPOTENCY_KEY_CONFLICT',
        message: '幂等键已被其他视频任务使用',
      });
    }
  }

  private normalizeIdempotencyKey(userId: string, value: string | undefined): string {
    const key = value?.trim() ?? '';

    if (!key || key.length > MAX_IDEMPOTENCY_KEY_LENGTH) {
      throw new ConflictException({
        code: 'INVALID_IDEMPOTENCY_KEY',
        message: '幂等键不能为空且不能超过 128 个字符',
      });
    }

    return `video:${userId}:${key}`;
  }

  private toTaskDto(task: VideoTaskWithFiles) {
    return {
      completedAt: task.completedAt,
      createdAt: task.createdAt,
      errorCode: task.errorCode,
      errorMessage: task.errorMessage,
      id: task.id,
      lastFrameFile: task.lastFrameFile ? this.toFileDto(task.lastFrameFile) : null,
      modelAlias: task.modelAlias,
      parameters: task.parameters,
      progress: task.progress,
      prompt: task.prompt,
      resultFile: task.resultFile ? this.toFileDto(task.resultFile) : null,
      sourceFile: task.sourceFile ? this.toFileDto(task.sourceFile) : null,
      startedAt: task.startedAt,
      status: task.status,
    };
  }

  private toFileDto(file: FileAsset) {
    return {
      checksum: file.checksum,
      createdAt: file.createdAt,
      id: file.id,
      mimeType: file.mimeType,
      originalName: file.originalName,
      size: file.size,
    };
  }

  private toRecord(value: Prisma.JsonValue | null): Record<string, unknown> | undefined {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : undefined;
  }

  private classifyError(error: unknown): { code: string; message: string } {
    const response =
      typeof error === 'object' && error !== null && 'getResponse' in error
        ? (error as { getResponse: () => unknown }).getResponse()
        : undefined;
    const payload =
      typeof response === 'object' && response !== null
        ? (response as Record<string, unknown>)
        : undefined;
    const code =
      typeof payload?.code === 'string'
        ? payload.code
        : typeof (error as { code?: unknown })?.code === 'string'
          ? String((error as { code: string }).code)
          : 'VIDEO_GENERATION_FAILED';
    const messages: Record<string, string> = {
      INSUFFICIENT_POINTS: '积分不足，请先充值或减少任务消耗',
      VIDEO_AUTH_ERROR: '视频生成服务鉴权失败，本次积分已退回',
      VIDEO_GENERATION_FAILED: '视频生成失败，本次积分已退回',
      VIDEO_INVALID_RESPONSE: '视频生成服务返回了无效响应，本次积分已退回',
      VIDEO_LAST_FRAME_UNSUPPORTED: '当前视频模型暂不支持首尾帧模式，本次积分已退回',
      VIDEO_NOT_CONFIGURED: '视频生成服务尚未配置，本次积分已退回',
      VIDEO_PROVIDER_INVALID_RESULT: '视频生成服务返回了空结果，请重试',
      VIDEO_PROVIDER_TASK_NOT_FOUND: '视频任务已失效，请重新提交',
      VIDEO_PROVIDER_UNAVAILABLE: '视频生成服务暂时不可用，本次积分已退回',
      VIDEO_RATE_LIMITED: '视频生成请求过于频繁，本次积分已退回',
      VIDEO_REQUEST_ERROR: '视频生成请求失败，本次积分已退回',
      VIDEO_RESULT_DOWNLOAD_FAILED: '视频结果下载失败，本次积分已退回',
      VIDEO_RESULT_TOO_LARGE: '视频结果超过允许的大小，本次积分已退回',
      VIDEO_TASK_POINTS_NOT_RESERVED: '视频任务积分冻结记录不存在，请重新提交任务',
      VIDEO_TASK_STATE_CONFLICT: '视频任务状态已发生变化，请刷新后重试',
      VIDEO_TIMEOUT: '视频生成超时，本次积分已退回',
      VIDEO_WORKER_RESTARTED: '视频任务因服务重启中断，本次积分已退回',
    };

    return {
      code,
      message:
        typeof payload?.message === 'string'
          ? payload.message
          : (messages[code] ?? '视频生成失败，本次积分已退回'),
    };
  }

  private createVideoError(code: string, message: string): Error {
    const error = new Error(message);
    Object.assign(error, { code });

    return error;
  }

  private async waitForNextPoll(delayMs: number): Promise<void> {
    await new Promise<void>((resolve) => {
      const timer = setTimeout(resolve, Math.max(100, delayMs));

      timer.unref();
    });
  }
}
