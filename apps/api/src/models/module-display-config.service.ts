import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { ModuleDisplayConfig as ModuleDisplayConfigRecord } from '@prisma/client';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import type {
  ModuleDisplayGroup,
  UpdateModuleDisplayConfigDto,
} from './dto/update-module-display-config.dto';

export interface ModuleDisplayConfigItem {
  badge: string | null;
  cover: string | null;
  customized: boolean;
  group: ModuleDisplayGroup;
  icon: string;
  key: string;
  name: string;
  route: string;
  sortOrder: number;
  visible: boolean;
}

type DefaultModuleDisplayConfig = Omit<ModuleDisplayConfigItem, 'customized'>;

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
    visible: true,
  },
  {
    badge: '100+',
    cover: null,
    group: 'primary',
    icon: 'chat',
    key: 'chat',
    name: '模型对话',
    route: '/chat',
    sortOrder: 20,
    visible: true,
  },
  {
    badge: null,
    cover: null,
    group: 'primary',
    icon: 'draw',
    key: 'draw',
    name: 'AI 绘画',
    route: '/draw',
    sortOrder: 30,
    visible: true,
  },
  {
    badge: '6000+',
    cover: null,
    group: 'primary',
    icon: 'agents',
    key: 'agents',
    name: '超级智能体',
    route: '/agents',
    sortOrder: 40,
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
    visible: true,
  },
  {
    badge: null,
    cover: null,
    group: 'primary',
    icon: 'video',
    key: 'video',
    name: '视频生成',
    route: '/video',
    sortOrder: 70,
    visible: true,
  },
  {
    badge: null,
    cover: null,
    group: 'primary',
    icon: 'canvas',
    key: 'canvas',
    name: 'AI 画布',
    route: '/canvas',
    sortOrder: 80,
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
    visible: true,
  },
];

@Injectable()
export class ModuleDisplayConfigService {
  private readonly logger = new Logger(ModuleDisplayConfigService.name);

  constructor(private readonly prismaService: PrismaService) {}

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
    const existing = defaultConfig
      ? null
      : await this.prismaService.moduleDisplayConfig.findUnique({
          where: { key: normalizedKey },
        });

    if (!defaultConfig && !existing) {
      throw new NotFoundException({
        code: 'MODULE_DISPLAY_CONFIG_NOT_FOUND',
        message: '模块不存在',
      });
    }

    const data = {
      badge: input.badge === undefined ? undefined : input.badge?.trim() || null,
      cover: input.cover === undefined ? undefined : input.cover?.trim() || null,
      group: input.group,
      icon: input.icon?.trim(),
      name: input.name?.trim(),
      route: input.route?.trim(),
      sortOrder: input.sortOrder,
      visible: input.visible,
    };
    const record = await this.prismaService.moduleDisplayConfig.upsert({
      create: {
        badge: data.badge ?? defaultConfig?.badge ?? null,
        cover: data.cover ?? defaultConfig?.cover ?? null,
        group: data.group ?? defaultConfig?.group ?? 'primary',
        icon: data.icon ?? defaultConfig?.icon ?? 'app',
        key: normalizedKey,
        name: data.name ?? defaultConfig?.name ?? normalizedKey,
        route: data.route ?? defaultConfig?.route ?? '/',
        sortOrder: data.sortOrder ?? defaultConfig?.sortOrder ?? 100,
        visible: data.visible ?? defaultConfig?.visible ?? true,
      },
      update: data,
      where: { key: normalizedKey },
    });

    return this.toItem(record, true);
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
    return {
      badge: record.badge,
      cover: record.cover,
      customized,
      group: record.group as ModuleDisplayGroup,
      icon: record.icon,
      key: record.key,
      name: record.name,
      route: record.route,
      sortOrder: record.sortOrder,
      visible: record.visible,
    };
  }
}
