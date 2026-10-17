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
import type { FileAsset, ImageTask } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { FilesService } from '../files/files.service';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import { ModelRegistryService } from '../models/model-registry.service';
import { PointsService } from '../points/points.service';
import { IMAGE_PROVIDER, type ImageProvider } from '../providers/image-provider';
import { STORAGE_ADAPTER, type StorageAdapter } from '../storage/storage.types';
import type { CreateImageTaskDto } from './dto/create-image-task.dto';

const MAX_IDEMPOTENCY_KEY_LENGTH = 128;

type ImageTaskWithFiles = Prisma.ImageTaskGetPayload<{
  include: {
    resultFile: true;
    sourceFile: true;
  };
}>;

@Injectable()
export class ImageTasksService implements OnModuleInit {
  private readonly logger = new Logger(ImageTasksService.name);
  private readonly processingTaskIds = new Set<string>();

  constructor(
    private readonly configService: ConfigService,
    private readonly filesService: FilesService,
    @Inject(IMAGE_PROVIDER) private readonly imageProvider: ImageProvider,
    private readonly modelRegistryService: ModelRegistryService,
    private readonly pointsService: PointsService,
    private readonly prismaService: PrismaService,
    @Inject(STORAGE_ADAPTER) private readonly storageAdapter: StorageAdapter,
  ) {}

  async onModuleInit(): Promise<void> {
    const staleTasks = await this.prismaService.imageTask.findMany({
      where: { status: 'RUNNING' },
    });

    for (const task of staleTasks) {
      await this.markFailed(task.id, task.userId, {
        code: 'IMAGE_WORKER_RESTARTED',
        message: '生成任务因服务重启中断，本次积分已退回',
      });
    }

    const queuedTasks = await this.prismaService.imageTask.findMany({
      orderBy: { createdAt: 'asc' },
      select: { id: true },
      where: { status: 'QUEUED' },
    });

    for (const task of queuedTasks) {
      this.schedule(task.id);
    }
  }

  async create(userId: string, input: CreateImageTaskDto, rawIdempotencyKey: string | undefined) {
    const idempotencyKey = this.normalizeIdempotencyKey(userId, rawIdempotencyKey);
    const prompt = input.prompt.trim();
    const referenceFileIds = this.normalizeReferenceFileIds(input.referenceFileIds);
    const taskParameters = this.buildTaskParameters(input.parameters, referenceFileIds);

    if (!prompt) {
      throw new ConflictException({
        code: 'IMAGE_PROMPT_REQUIRED',
        message: '图片描述不能为空',
      });
    }

    const model = input.modelAlias
      ? this.modelRegistryService.getByAlias(input.modelAlias)
      : this.modelRegistryService.getDefaultImageModel();

    if (!model.capabilities.includes('image')) {
      throw new ConflictException({
        code: 'IMAGE_MODEL_NOT_FOUND',
        message: '所选模型不支持图片生成',
      });
    }

    if (input.sourceFileId) {
      await this.filesService.getOwnedAsset(userId, input.sourceFileId);
    }

    if (referenceFileIds.length > 0 && !input.sourceFileId) {
      throw new ConflictException({
        code: 'IMAGE_SOURCE_REQUIRED',
        message: '使用参考图时请先上传主图片',
      });
    }

    for (const referenceFileId of referenceFileIds) {
      await this.filesService.getOwnedAsset(userId, referenceFileId);
    }

    const existing = await this.prismaService.imageTask.findUnique({
      where: { idempotencyKey },
    });

    if (existing) {
      this.assertMatchingTask(existing, input, model.alias, prompt, taskParameters);
      this.schedule(existing.id);

      return this.getTask(userId, existing.id);
    }

    const taskId = randomUUID();
    const pointsCost = this.configService.get<number>('IMAGE_TASK_POINTS_COST', 5);

    try {
      await this.prismaService.imageTask.create({
        data: {
          id: taskId,
          idempotencyKey,
          modelAlias: model.alias,
          parameters: taskParameters as Prisma.InputJsonValue | undefined,
          prompt,
          sourceFileId: input.sourceFileId,
          userId,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const concurrent = await this.prismaService.imageTask.findUniqueOrThrow({
          where: { idempotencyKey },
        });
        this.assertMatchingTask(concurrent, input, model.alias, prompt, taskParameters);
        this.schedule(concurrent.id);

        return this.getTask(userId, concurrent.id);
      }

      throw error;
    }

    try {
      await this.pointsService.reserve({
        amount: pointsCost,
        idempotencyKey: `image-hold:${idempotencyKey}`,
        referenceId: taskId,
        referenceType: 'image_task',
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
    const tasks = await this.prismaService.imageTask.findMany({
      include: {
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
  ): Promise<ReturnType<ImageTasksService['toTaskDto']>> {
    const task = await this.prismaService.imageTask.findFirst({
      include: {
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
        code: 'IMAGE_TASK_NOT_FOUND',
        message: '图片任务不存在或无权访问',
      });
    }

    return this.toTaskDto(task);
  }

  private schedule(taskId: string): void {
    if (this.processingTaskIds.has(taskId)) {
      return;
    }

    this.processingTaskIds.add(taskId);
    const timer = setTimeout(() => {
      void this.process(taskId).finally(() => {
        this.processingTaskIds.delete(taskId);
      });
    }, 0);
    timer.unref();
  }

  private async process(taskId: string): Promise<void> {
    const claimed = await this.prismaService.imageTask.updateMany({
      data: {
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

    const task = await this.prismaService.imageTask.findUnique({
      include: {
        sourceFile: true,
      },
      where: { id: taskId },
    });

    if (!task) {
      return;
    }

    const model = this.modelRegistryService.getByAlias(task.modelAlias);
    let resultStorageKey: string | undefined;

    try {
      const sourceImages = task.sourceFile
        ? [
            {
              buffer: await this.storageAdapter.read(task.sourceFile.storageKey),
              mimeType: task.sourceFile.mimeType,
              originalName: task.sourceFile.originalName,
            },
          ]
        : [];

      for (const referenceFileId of this.readReferenceFileIds(task.parameters)) {
        const referenceFile = await this.filesService.getOwnedAsset(task.userId, referenceFileId);

        sourceImages.push({
          buffer: await this.storageAdapter.read(referenceFile.storageKey),
          mimeType: referenceFile.mimeType,
          originalName: referenceFile.originalName,
        });
      }

      const generated = await this.imageProvider.generateImage({
        model: model.providerModel,
        parameters: this.toRecord(task.parameters),
        prompt: task.prompt,
        sourceImages: sourceImages.length > 0 ? sourceImages : undefined,
      });

      if (!Buffer.isBuffer(generated.buffer) || generated.buffer.length === 0) {
        throw this.createImageError(
          'IMAGE_PROVIDER_INVALID_RESULT',
          '图片生成服务返回了空结果，请重试',
        );
      }

      const stored = await this.storageAdapter.save({
        buffer: generated.buffer,
        extension: generated.extension,
        mimeType: generated.mimeType,
        originalName: `${task.id}.${generated.extension}`,
        userId: task.userId,
      });
      resultStorageKey = stored.storageKey;

      const resultFile = await this.prismaService.$transaction(async (transaction) => {
        const fileAsset = await transaction.fileAsset.create({
          data: {
            checksum: stored.checksum,
            mimeType: generated.mimeType,
            originalName: `${task.id}.${generated.extension}`,
            size: stored.size,
            storageKey: stored.storageKey,
            userId: task.userId,
          },
        });
        const updated = await transaction.imageTask.updateMany({
          data: {
            completedAt: new Date(),
            resultFileId: fileAsset.id,
            status: 'SUCCEEDED',
          },
          where: {
            id: task.id,
            status: 'RUNNING',
          },
        });

        if (updated.count !== 1) {
          throw new ConflictException({
            code: 'IMAGE_TASK_STATE_CONFLICT',
            message: '图片任务状态已发生变化',
          });
        }

        const reservation = await transaction.pointsReservation.findFirst({
          where: {
            referenceId: task.id,
            referenceType: 'image_task',
            userId: task.userId,
          },
        });

        if (!reservation) {
          throw new ConflictException({
            code: 'IMAGE_TASK_POINTS_NOT_RESERVED',
            message: '图片任务积分冻结记录不存在',
          });
        }

        await this.pointsService.settleInTransaction(transaction, reservation.id);

        return fileAsset;
      });

      resultStorageKey = undefined;
      this.logger.log(`Image task ${task.id} completed with file ${resultFile.id}`);
    } catch (error) {
      if (resultStorageKey) {
        await this.storageAdapter.delete(resultStorageKey).catch(() => undefined);
      }

      const classified = this.classifyError(error);
      this.logger.warn(`Image task ${task.id} failed: ${classified.code}`);
      await this.markFailed(task.id, task.userId, classified);
    }
  }

  private async markFailed(
    taskId: string,
    userId: string,
    error: { code: string; message: string },
    refundReservation = true,
  ): Promise<void> {
    await this.prismaService.$transaction(async (transaction) => {
      const updated = await transaction.imageTask.updateMany({
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
          referenceType: 'image_task',
          userId,
        },
      });

      if (reservation?.status === 'RESERVED') {
        await this.pointsService.refundInTransaction(transaction, reservation.id);
      }
    });
  }

  private assertMatchingTask(
    task: ImageTask,
    input: CreateImageTaskDto,
    modelAlias: string,
    prompt: string,
    parameters: Record<string, unknown> | undefined,
  ): void {
    const parametersMatch =
      JSON.stringify(task.parameters ?? null) === JSON.stringify(parameters ?? null);

    if (
      task.modelAlias !== modelAlias ||
      task.prompt !== prompt ||
      task.sourceFileId !== (input.sourceFileId ?? null) ||
      !parametersMatch
    ) {
      throw new ConflictException({
        code: 'IDEMPOTENCY_KEY_CONFLICT',
        message: '幂等键已被其他图片任务使用',
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

    return `image:${userId}:${key}`;
  }

  private normalizeReferenceFileIds(value: string[] | undefined): string[] {
    return Array.from(new Set((value ?? []).map((fileId) => fileId.trim()).filter(Boolean)));
  }

  private buildTaskParameters(
    parameters: Record<string, unknown> | undefined,
    referenceFileIds: string[],
  ): Record<string, unknown> | undefined {
    const sanitized = { ...parameters };
    delete sanitized.referenceFileIds;

    if (referenceFileIds.length > 0) {
      sanitized.referenceFileIds = referenceFileIds;
    }

    return parameters || referenceFileIds.length > 0 ? sanitized : undefined;
  }

  private readReferenceFileIds(parameters: Prisma.JsonValue | null): string[] {
    const record = this.toRecord(parameters);
    const value = record?.referenceFileIds;

    if (!Array.isArray(value)) {
      return [];
    }

    return value.filter(
      (fileId): fileId is string => typeof fileId === 'string' && Boolean(fileId),
    );
  }

  private toTaskDto(task: ImageTaskWithFiles) {
    return {
      completedAt: task.completedAt,
      createdAt: task.createdAt,
      errorCode: task.errorCode,
      errorMessage: task.errorMessage,
      id: task.id,
      modelAlias: task.modelAlias,
      parameters: task.parameters,
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
          : 'IMAGE_GENERATION_FAILED';

    const messages: Record<string, string> = {
      IMAGE_GENERATION_FAILED: '图片生成失败，本次积分已退回',
      IMAGE_AUTH_ERROR: '图片生成服务鉴权失败，本次积分已退回',
      IMAGE_INVALID_RESPONSE: '图片生成服务返回了无效响应，本次积分已退回',
      IMAGE_NOT_CONFIGURED: '图片生成服务尚未配置，本次积分已退回',
      IMAGE_PROVIDER_INVALID_RESULT: '图片生成服务返回了空结果，请重试',
      IMAGE_PROVIDER_UNAVAILABLE: '图片生成服务暂时不可用，本次积分已退回',
      IMAGE_RATE_LIMITED: '图片生成请求过于频繁，本次积分已退回',
      IMAGE_REQUEST_ERROR: '图片生成请求失败，本次积分已退回',
      IMAGE_RESULT_DOWNLOAD_FAILED: '图片结果下载失败，本次积分已退回',
      IMAGE_RESULT_TOO_LARGE: '图片结果超过允许的大小，本次积分已退回',
      IMAGE_TASK_POINTS_NOT_RESERVED: '图片任务积分冻结记录不存在，请重新提交任务',
      IMAGE_TASK_STATE_CONFLICT: '图片任务状态已发生变化，请刷新后重试',
      IMAGE_TIMEOUT: '图片生成请求超时，本次积分已退回',
      IMAGE_WORKER_RESTARTED: '生成任务因服务重启中断，本次积分已退回',
      INSUFFICIENT_POINTS: '积分不足，请先充值或减少任务消耗',
    };

    return {
      code,
      message: messages[code] ?? '图片生成失败，本次积分已退回',
    };
  }

  private createImageError(code: string, message: string): Error {
    const error = new Error(message);
    Object.assign(error, { code });

    return error;
  }
}
