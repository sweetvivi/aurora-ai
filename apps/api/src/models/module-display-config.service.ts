import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { ModuleDisplayConfig as ModuleDisplayConfigRecord } from '@prisma/client';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import {
  detectImageMimeType,
  normalizeMimeType,
  type UploadedImageFile,
  validateImageUpload,
} from '../files/image-file.validator';
import { STORAGE_ADAPTER, type StorageAdapter } from '../storage/storage.types';
import type {
  ModuleDisplayGroup,
  UpdateModuleDisplayConfigDto,
} from './dto/update-module-display-config.dto';

export const MODULE_COVER_MAX_BYTES = 8 * 1024 * 1024;

export interface ModuleDisplayConfigItem {
  badge: string | null;
  cover: string | null;
  coverSource: 'local' | 'url' | null;
  customized: boolean;
  group: ModuleDisplayGroup;
  icon: string;
  key: string;
  name: string;
  route: string;
  sortOrder: number;
  subtitle: string | null;
  visible: boolean;
}

type DefaultModuleDisplayConfig = Omit<ModuleDisplayConfigItem, 'coverSource' | 'customized'>;

export const DEFAULT_MODULE_DISPLAY_CONFIGS: readonly DefaultModuleDisplayConfig[] = [
  {
    badge: null,
    cover: null,
    group: 'primary',
    icon: 'home',
    key: 'home',
    name: '首页',
    route: '/',
    sortOrder: 10,
    subtitle: null,
    visible: true,
  },
  {
    badge: null,
    cover: null,
    group: 'primary',
    icon: 'chat',
    key: 'chat',
    name: '模型对话',
    route: '/newchat',
    sortOrder: 20,
    subtitle: '100+大模型',
    visible: true,
  },
  {
    badge: null,
    cover: null,
    group: 'primary',
    icon: 'draw',
    key: 'draw',
    name: 'AI绘画',
    route: '/draw',
    sortOrder: 30,
    subtitle: '绘图 / 修图 / 图片创作',
    visible: true,
  },
  {
    badge: null,
    cover: null,
    group: 'primary',
    icon: 'agents',
    key: 'agents',
    name: '超级智能体',
    route: '/agents',
    sortOrder: 40,
    subtitle: '1000+功能',
    visible: true,
  },
  {
    badge: null,
    cover: null,
    group: 'primary',
    icon: 'retouch',
    key: 'retouch',
    name: '智能修图',
    route: '/retouch',
    sortOrder: 50,
    subtitle: '抠图、一键PS',
    visible: true,
  },
  {
    badge: null,
    cover: null,
    group: 'primary',
    icon: 'image-generation',
    key: 'image-generation',
    name: '图片生成',
    route: '/image-generation',
    sortOrder: 60,
    subtitle: '3D手办、文生图',
    visible: true,
  },
  {
    badge: null,
    cover: null,
    group: 'primary',
    icon: 'video',
    key: 'video',
    name: '视频生成3.0',
    route: '/video',
    sortOrder: 70,
    subtitle: 'Seedance2.0',
    visible: true,
  },
  {
    badge: null,
    cover: null,
    group: 'primary',
    icon: 'canvas',
    key: 'canvas',
    name: 'AI画布',
    route: '/canvas',
    sortOrder: 80,
    subtitle: '画布生图 / 画布视频',
    visible: true,
  },
  {
    badge: null,
    cover: null,
    group: 'primary',
    icon: 'commerce',
    key: 'commerce',
    name: '电商工具',
    route: '/commerce',
    sortOrder: 90,
    subtitle: '试衣、换背景',
    visible: true,
  },
  {
    badge: null,
    cover: null,
    group: 'primary',
    icon: 'music',
    key: 'music',
    name: 'AI 音乐',
    route: '/music',
    sortOrder: 100,
    subtitle: '真人、克隆',
    visible: true,
  },
  {
    badge: null,
    cover: null,
    group: 'creation-office',
    icon: 'workbench',
    key: 'workbench',
    name: '文档处理',
    route: '/workbench',
    sortOrder: 110,
    subtitle: '写作、表格、汇报',
    visible: true,
  },
  {
    badge: null,
    cover: null,
    group: 'creation-office',
    icon: 'map',
    key: 'map',
    name: '工具地图',
    route: '/map',
    sortOrder: 120,
    subtitle: '全部能力一览',
    visible: true,
  },
  {
    badge: null,
    cover: null,
    group: 'creation-office',
    icon: 'all-tools',
    key: 'all-tools',
    name: '全部工具',
    route: '/map',
    sortOrder: 130,
    subtitle: '更多功能',
    visible: true,
  },
];

@Injectable()
export class ModuleDisplayConfigService {
  private readonly logger = new Logger(ModuleDisplayConfigService.name);

  constructor(
    private readonly prismaService: PrismaService,
    @Inject(STORAGE_ADAPTER) private readonly storageAdapter: StorageAdapter,
  ) {}

  async listPublic(): Promise<{
    items: ModuleDisplayConfigItem[];
    source: 'database' | 'defaults';
  }> {
    const { items, source } = await this.listEffective();

    return {
      items: items.filter((item) => item.visible),
      source,
    };
  }

  async listAdmin(): Promise<{
    items: ModuleDisplayConfigItem[];
    source: 'database' | 'defaults';
  }> {
    return this.listEffective();
  }

  async update(key: string, input: UpdateModuleDisplayConfigDto): Promise<ModuleDisplayConfigItem> {
    const normalizedKey = key.trim();
    const defaultConfig = DEFAULT_MODULE_DISPLAY_CONFIGS.find((item) => item.key === normalizedKey);
    const existing = await this.prismaService.moduleDisplayConfig.findUnique({
      where: { key: normalizedKey },
    });

    if (!defaultConfig && !existing) {
      throw new NotFoundException({
        code: 'MODULE_DISPLAY_CONFIG_NOT_FOUND',
        message: '模块不存在',
      });
    }

    const externalCoverChanged = input.cover !== undefined;
    const externalCover = input.cover?.trim() || null;
    const data = {
      badge: input.badge === undefined ? undefined : input.badge?.trim() || null,
      cover: externalCoverChanged ? externalCover : undefined,
      coverStorageKey: externalCoverChanged ? null : undefined,
      group: input.group,
      icon: input.icon?.trim(),
      name: input.name?.trim(),
      route: input.route?.trim(),
      sortOrder: input.sortOrder,
      subtitle: input.subtitle === undefined ? undefined : input.subtitle?.trim() || null,
      visible: input.visible,
    };
    const record = await this.prismaService.moduleDisplayConfig.upsert({
      create: {
        badge: data.badge ?? defaultConfig?.badge ?? null,
        cover: externalCoverChanged ? externalCover : (defaultConfig?.cover ?? null),
        coverStorageKey: null,
        group: data.group ?? defaultConfig?.group ?? 'primary',
        icon: data.icon ?? defaultConfig?.icon ?? 'app',
        key: normalizedKey,
        name: data.name ?? defaultConfig?.name ?? normalizedKey,
        route: data.route ?? defaultConfig?.route ?? '/',
        sortOrder: data.sortOrder ?? defaultConfig?.sortOrder ?? 100,
        subtitle: data.subtitle ?? defaultConfig?.subtitle ?? null,
        visible: data.visible ?? defaultConfig?.visible ?? true,
      },
      update: data,
      where: { key: normalizedKey },
    });

    if (externalCoverChanged && existing?.coverStorageKey) {
      await this.storageAdapter.delete(existing.coverStorageKey);
    }

    return this.toItem(record, true);
  }

  async uploadCover(
    key: string,
    actorId: string,
    file: UploadedImageFile | undefined,
  ): Promise<ModuleDisplayConfigItem> {
    const normalizedKey = key.trim();
    const defaultConfig = DEFAULT_MODULE_DISPLAY_CONFIGS.find((item) => item.key === normalizedKey);
    const existing = await this.prismaService.moduleDisplayConfig.findUnique({
      where: { key: normalizedKey },
    });

    if (!defaultConfig && !existing) {
      throw new NotFoundException({
        code: 'MODULE_DISPLAY_CONFIG_NOT_FOUND',
        message: '模块不存在',
      });
    }

    validateImageUpload(file, { maxBytes: MODULE_COVER_MAX_BYTES });
    const uploadedFile = file as UploadedImageFile;
    const mimeType = normalizeMimeType(uploadedFile.mimetype);
    const stored = await this.storageAdapter.save({
      buffer: uploadedFile.buffer,
      extension: extensionFromMimeType(mimeType),
      mimeType,
      originalName: uploadedFile.originalname,
      userId: actorId,
    });

    let record: ModuleDisplayConfigRecord;

    try {
      record = await this.prismaService.moduleDisplayConfig.upsert({
        create: {
          badge: defaultConfig?.badge ?? null,
          cover: null,
          coverStorageKey: stored.storageKey,
          group: defaultConfig?.group ?? 'primary',
          icon: defaultConfig?.icon ?? 'app',
          key: normalizedKey,
          name: defaultConfig?.name ?? normalizedKey,
          route: defaultConfig?.route ?? '/',
          sortOrder: defaultConfig?.sortOrder ?? 100,
          subtitle: defaultConfig?.subtitle ?? null,
          visible: defaultConfig?.visible ?? true,
        },
        update: {
          cover: null,
          coverStorageKey: stored.storageKey,
        },
        where: { key: normalizedKey },
      });
    } catch (error) {
      await this.storageAdapter.delete(stored.storageKey);
      throw error;
    }

    if (existing?.coverStorageKey) {
      await this.storageAdapter.delete(existing.coverStorageKey);
    }

    return this.toItem(record, true);
  }

  async readPublicCover(key: string): Promise<{ buffer: Buffer; mimeType: string }> {
    const record = await this.prismaService.moduleDisplayConfig.findUnique({
      where: { key: key.trim() },
    });

    if (!record?.coverStorageKey) {
      throw new NotFoundException({
        code: 'MODULE_COVER_NOT_FOUND',
        message: '模块封面不存在',
      });
    }

    const buffer = await this.storageAdapter.read(record.coverStorageKey);

    return {
      buffer,
      mimeType: detectImageMimeType(buffer) ?? 'application/octet-stream',
    };
  }

  private async listEffective(): Promise<{
    items: ModuleDisplayConfigItem[];
    source: 'database' | 'defaults';
  }> {
    let records: ModuleDisplayConfigRecord[];

    try {
      records = await this.prismaService.moduleDisplayConfig.findMany({
        orderBy: [{ sortOrder: 'asc' }, { key: 'asc' }],
      });
    } catch (error) {
      this.logger.warn(
        `Module display config load failed; using defaults: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );

      return {
        items: DEFAULT_MODULE_DISPLAY_CONFIGS.map((item) => ({
          ...item,
          coverSource: null,
          customized: false,
        })),
        source: 'defaults',
      };
    }

    const overrides = new Map(records.map((record) => [record.key, record]));
    const items = DEFAULT_MODULE_DISPLAY_CONFIGS.map((item) => {
      const override = overrides.get(item.key);

      if (!override) {
        return {
          ...item,
          coverSource: null,
          customized: false,
        };
      }

      overrides.delete(item.key);
      return this.toItem(override, true);
    });

    for (const record of overrides.values()) {
      items.push(this.toItem(record, true));
    }

    items.sort(
      (left, right) => left.sortOrder - right.sortOrder || left.key.localeCompare(right.key),
    );

    return {
      items,
      source: 'database',
    };
  }

  private toItem(record: ModuleDisplayConfigRecord, customized: boolean): ModuleDisplayConfigItem {
    const localCover = record.coverStorageKey
      ? `/api/v1/modules/display/${encodeURIComponent(record.key)}/cover?v=${record.updatedAt.getTime()}`
      : null;

    return {
      badge: record.badge,
      cover: localCover ?? record.cover,
      coverSource: localCover ? 'local' : record.cover ? 'url' : null,
      customized,
      group: record.group as ModuleDisplayGroup,
      icon: record.icon,
      key: record.key,
      name: record.name,
      route: record.route,
      sortOrder: record.sortOrder,
      subtitle: record.subtitle,
      visible: record.visible,
    };
  }
}

function extensionFromMimeType(mimeType: string): string {
  return (
    {
      'image/gif': 'gif',
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
    }[mimeType] ?? 'bin'
  );
}
