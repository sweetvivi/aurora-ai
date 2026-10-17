import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import { ModelRegistryService } from '../models/model-registry.service';
import type { AdjustAdminUserPointsDto } from './dto/adjust-admin-user-points.dto';
import type { CreateModelConfigDto } from './dto/create-model-config.dto';
import type { CreateProviderConfigDto } from './dto/create-provider-config.dto';
import type { ListAdminUsersQueryDto } from './dto/list-admin-users-query.dto';
import type { ListModelConfigsQueryDto } from './dto/list-model-configs-query.dto';
import type { UpdateAdminUserDto } from './dto/update-admin-user.dto';
import type { UpdateModelConfigDto } from './dto/update-model-config.dto';
import type { UpdateProviderConfigDto } from './dto/update-provider-config.dto';

type Capability = 'chat' | 'embedding' | 'image' | 'video';

const capabilityToDatabase: Record<Capability, 'CHAT' | 'EMBEDDING' | 'IMAGE' | 'VIDEO'> = {
  chat: 'CHAT',
  embedding: 'EMBEDDING',
  image: 'IMAGE',
  video: 'VIDEO',
};

const userSelect = {
  createdAt: true,
  displayName: true,
  email: true,
  id: true,
  pointsBalance: true,
  role: true,
  status: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

const providerSelect = {
  _count: {
    select: {
      models: true,
    },
  },
  baseUrl: true,
  code: true,
  createdAt: true,
  displayName: true,
  enabled: true,
  id: true,
  keyRef: true,
  kind: true,
  priority: true,
  updatedAt: true,
} satisfies Prisma.ProviderConfigSelect;

const modelSelect = {
  alias: true,
  capabilities: true,
  contextWindow: true,
  createdAt: true,
  displayName: true,
  enabled: true,
  id: true,
  provider: {
    select: {
      code: true,
      displayName: true,
      enabled: true,
      id: true,
    },
  },
  providerModel: true,
  updatedAt: true,
} satisfies Prisma.ModelConfigSelect;

@Injectable()
export class AdminService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly modelRegistryService: ModelRegistryService,
  ) {}

  async getOverview() {
    const [
      users,
      activeUsers,
      admins,
      providers,
      enabledProviders,
      models,
      enabledModels,
      chatRequests,
      imageTasks,
      videoTasks,
      points,
    ] = await Promise.all([
      this.prismaService.user.count(),
      this.prismaService.user.count({ where: { status: 'ACTIVE' } }),
      this.prismaService.user.count({ where: { role: 'ADMIN' } }),
      this.prismaService.providerConfig.count(),
      this.prismaService.providerConfig.count({ where: { enabled: true } }),
      this.prismaService.modelConfig.count(),
      this.prismaService.modelConfig.count({ where: { enabled: true } }),
      this.prismaService.chatRequest.count(),
      this.prismaService.imageTask.count(),
      this.prismaService.videoTask.count(),
      this.prismaService.user.aggregate({
        _sum: {
          pointsBalance: true,
        },
      }),
    ]);

    return {
      models: {
        enabled: enabledModels,
        total: models,
      },
      orders: {
        enabled: false,
        status: 'not_enabled' as const,
      },
      points: {
        balanceTotal: points._sum.pointsBalance ?? 0,
      },
      providers: {
        enabled: enabledProviders,
        total: providers,
      },
      tasks: {
        chatRequests,
        imageTasks,
        videoTasks,
      },
      users: {
        active: activeUsers,
        admins,
        total: users,
      },
    };
  }

  async listUsers(query: ListAdminUsersQueryDto) {
    const where: Prisma.UserWhereInput = {
      role: query.role,
      status: query.status,
    };

    if (query.search?.trim()) {
      const search = query.search.trim();
      where.OR = [
        {
          displayName: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          email: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          id: {
            equals: search,
          },
        },
      ];
    }

    const [items, total] = await Promise.all([
      this.prismaService.user.findMany({
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        select: userSelect,
        skip: query.offset,
        take: query.limit,
        where,
      }),
      this.prismaService.user.count({ where }),
    ]);

    return {
      items,
      limit: query.limit,
      offset: query.offset,
      total,
    };
  }

  async updateUser(actorId: string, userId: string, input: UpdateAdminUserDto) {
    const current = await this.prismaService.user.findUnique({
      select: userSelect,
      where: { id: userId },
    });

    if (!current) {
      throw this.notFound('USER_NOT_FOUND', '用户不存在');
    }

    if (actorId === userId) {
      if (input.role && input.role !== 'ADMIN') {
        throw new BadRequestException({
          code: 'CANNOT_DEMOTE_SELF',
          message: '不能取消自己的管理员权限',
        });
      }

      if (input.status && input.status !== 'ACTIVE') {
        throw new BadRequestException({
          code: 'CANNOT_SUSPEND_SELF',
          message: '不能停用当前登录账号',
        });
      }
    }

    const data: Prisma.UserUpdateInput = {};

    if (input.displayName !== undefined) {
      data.displayName = input.displayName.trim();
    }

    if (input.role !== undefined) {
      data.role = input.role;
    }

    if (input.status !== undefined) {
      data.status = input.status;
    }

    return this.prismaService.$transaction(async (transaction) => {
      const user = await transaction.user.update({
        data,
        select: userSelect,
        where: { id: userId },
      });

      if (input.status === 'SUSPENDED') {
        await transaction.refreshSession.updateMany({
          data: { revokedAt: new Date() },
          where: {
            revokedAt: null,
            userId,
          },
        });
      }

      return user;
    });
  }

  async adjustUserPoints(actorId: string, userId: string, input: AdjustAdminUserPointsDto) {
    if (input.delta === 0) {
      throw new BadRequestException({
        code: 'POINTS_DELTA_REQUIRED',
        message: '积分调整值不能为 0',
      });
    }

    const idempotencyKey = `admin-adjustment:${input.idempotencyKey ?? randomUUID()}`;

    return this.prismaService.$transaction(async (transaction) => {
      const existing = await transaction.pointsLedgerEntry.findUnique({
        where: { idempotencyKey },
      });

      if (existing) {
        if (existing.userId !== userId || existing.delta !== input.delta) {
          throw new ConflictException({
            code: 'IDEMPOTENCY_KEY_CONFLICT',
            message: '该幂等键已用于其他积分调整',
          });
        }

        const user = await transaction.user.findUniqueOrThrow({
          select: userSelect,
          where: { id: userId },
        });

        return {
          ledgerEntryId: existing.id,
          user,
        };
      }

      const current = await transaction.user.findUnique({
        select: {
          pointsBalance: true,
        },
        where: { id: userId },
      });

      if (!current) {
        throw this.notFound('USER_NOT_FOUND', '用户不存在');
      }

      const balanceAfter = current.pointsBalance + input.delta;

      if (balanceAfter < 0) {
        throw new BadRequestException({
          code: 'INSUFFICIENT_POINTS',
          message: '调整后的积分不能小于 0',
        });
      }

      const user = await transaction.user.update({
        data: {
          pointsBalance: balanceAfter,
        },
        select: userSelect,
        where: { id: userId },
      });
      const ledgerEntry = await transaction.pointsLedgerEntry.create({
        data: {
          balanceAfter,
          delta: input.delta,
          idempotencyKey,
          metadata: {
            actorId,
            reason: input.reason.trim(),
          },
          referenceId: userId,
          referenceType: 'admin_user',
          type: 'ADJUSTMENT',
          userId,
        },
      });

      return {
        ledgerEntryId: ledgerEntry.id,
        user,
      };
    });
  }

  async listProviders() {
    const items = await this.prismaService.providerConfig.findMany({
      orderBy: [{ priority: 'asc' }, { code: 'asc' }],
      select: providerSelect,
    });

    return { items };
  }

  async createProvider(input: CreateProviderConfigDto) {
    try {
      const provider = await this.prismaService.providerConfig.create({
        data: {
          baseUrl: input.baseUrl.trim().replace(/\/+$/, ''),
          code: input.code,
          displayName: input.displayName.trim(),
          enabled: input.enabled,
          keyRef: input.keyRef,
          priority: input.priority,
        },
        select: providerSelect,
      });
      await this.modelRegistryService.reload();

      return provider;
    } catch (error) {
      this.rethrowUniqueConflict(error, 'PROVIDER_CODE_EXISTS', '模型厂商代码已存在');
      throw error;
    }
  }

  async updateProvider(providerId: string, input: UpdateProviderConfigDto) {
    const data: Prisma.ProviderConfigUpdateInput = {};

    if (input.displayName !== undefined) {
      data.displayName = input.displayName.trim();
    }

    if (input.baseUrl !== undefined) {
      data.baseUrl = input.baseUrl.trim().replace(/\/+$/, '');
    }

    if (input.keyRef !== undefined) {
      data.keyRef = input.keyRef;
    }

    if (input.priority !== undefined) {
      data.priority = input.priority;
    }

    if (input.enabled !== undefined) {
      data.enabled = input.enabled;
    }

    try {
      const provider = await this.prismaService.providerConfig.update({
        data,
        select: providerSelect,
        where: { id: providerId },
      });
      await this.modelRegistryService.reload();

      return provider;
    } catch (error) {
      this.rethrowNotFound(error, 'PROVIDER_NOT_FOUND', '模型厂商不存在');
      throw error;
    }
  }

  async listModels(query: ListModelConfigsQueryDto) {
    const where: Prisma.ModelConfigWhereInput = {
      enabled: query.enabled,
      provider: query.providerCode
        ? {
            code: query.providerCode.trim(),
          }
        : undefined,
    };

    if (query.capability) {
      where.capabilities = {
        has: capabilityToDatabase[query.capability],
      };
    }

    if (query.search?.trim()) {
      const search = query.search.trim();
      where.OR = [
        {
          alias: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          displayName: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          providerModel: {
            contains: search,
            mode: 'insensitive',
          },
        },
      ];
    }

    const items = await this.prismaService.modelConfig.findMany({
      orderBy: [{ displayName: 'asc' }, { alias: 'asc' }],
      select: modelSelect,
      where,
    });

    return { items };
  }

  async createModel(input: CreateModelConfigDto) {
    const provider = await this.prismaService.providerConfig.findUnique({
      select: { id: true },
      where: { code: input.providerCode },
    });

    if (!provider) {
      throw this.notFound('PROVIDER_NOT_FOUND', '模型厂商不存在');
    }

    try {
      const model = await this.prismaService.modelConfig.create({
        data: {
          alias: input.alias,
          capabilities: input.capabilities.map((capability) => capabilityToDatabase[capability]),
          contextWindow: input.contextWindow,
          displayName: input.displayName.trim(),
          enabled: input.enabled,
          providerId: provider.id,
          providerModel: input.providerModel.trim(),
        },
        select: modelSelect,
      });
      await this.modelRegistryService.reload();

      return model;
    } catch (error) {
      this.rethrowUniqueConflict(error, 'MODEL_ALIAS_EXISTS', '模型别名已存在');
      throw error;
    }
  }

  async updateModel(modelId: string, input: UpdateModelConfigDto) {
    const data: Prisma.ModelConfigUpdateInput = {};

    if (input.providerCode !== undefined) {
      const provider = await this.prismaService.providerConfig.findUnique({
        select: { id: true },
        where: { code: input.providerCode },
      });

      if (!provider) {
        throw this.notFound('PROVIDER_NOT_FOUND', '模型厂商不存在');
      }

      data.provider = {
        connect: {
          id: provider.id,
        },
      };
    }

    if (input.providerModel !== undefined) {
      data.providerModel = input.providerModel.trim();
    }

    if (input.displayName !== undefined) {
      data.displayName = input.displayName.trim();
    }

    if (input.capabilities !== undefined) {
      data.capabilities = input.capabilities.map((capability) => capabilityToDatabase[capability]);
    }

    if (input.contextWindow !== undefined) {
      data.contextWindow = input.contextWindow;
    }

    if (input.enabled !== undefined) {
      data.enabled = input.enabled;
    }

    try {
      const model = await this.prismaService.modelConfig.update({
        data,
        select: modelSelect,
        where: { id: modelId },
      });
      await this.modelRegistryService.reload();

      return model;
    } catch (error) {
      this.rethrowNotFound(error, 'MODEL_NOT_FOUND', '模型配置不存在');
      throw error;
    }
  }

  private notFound(code: string, message: string): NotFoundException {
    return new NotFoundException({
      code,
      message,
    });
  }

  private rethrowNotFound(error: unknown, code: string, message: string): void {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      throw this.notFound(code, message);
    }
  }

  private rethrowUniqueConflict(error: unknown, code: string, message: string): void {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictException({
        code,
        message,
      });
    }
  }
}
