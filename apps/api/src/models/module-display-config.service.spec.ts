import { NotFoundException } from '@nestjs/common';
import type { PrismaService } from '../infrastructure/prisma/prisma.service';
import { describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_MODULE_DISPLAY_CONFIGS,
  ModuleDisplayConfigService,
} from './module-display-config.service';

function moduleRecord(overrides: Record<string, unknown> = {}) {
  return {
    badge: null,
    cover: null,
    createdAt: new Date('2026-10-17T00:00:00.000Z'),
    group: 'primary',
    icon: 'chat',
    id: 'module-record-1',
    key: 'chat',
    name: '模型对话',
    route: '/chat',
    sortOrder: 20,
    updatedAt: new Date('2026-10-17T00:00:00.000Z'),
    visible: true,
    ...overrides,
  };
}

function createService(records: unknown[] = []) {
  const moduleDisplayConfig = {
    findMany: vi.fn().mockResolvedValue(records),
    findUnique: vi.fn().mockResolvedValue(null),
    upsert: vi.fn(),
  };
  const service = new ModuleDisplayConfigService({
    moduleDisplayConfig,
  } as unknown as PrismaService);

  return {
    moduleDisplayConfig,
    service,
  };
}

describe('module display config service', () => {
  it('merges database overrides with defaults and filters hidden public modules', async () => {
    const { service } = createService([
      moduleRecord({
        badge: 'NEW',
        key: 'chat',
        name: '在线对话',
        sortOrder: 5,
        visible: false,
      }),
      moduleRecord({
        group: 'culture',
        icon: 'custom',
        id: 'module-record-2',
        key: 'custom-module',
        name: '自定义模块',
        route: '/custom',
        sortOrder: 6,
        visible: true,
      }),
    ]);

    const result = await service.listPublic();

    expect(result.source).toBe('database');
    expect(result.items.some((item) => item.key === 'chat')).toBe(false);
    expect(result.items[0]).toMatchObject({
      key: 'custom-module',
      name: '自定义模块',
      sortOrder: 6,
    });
    expect(result.items.find((item) => item.key === 'draw')).toMatchObject({
      customized: false,
      visible: true,
    });
  });

  it('keeps hidden and customized records in the admin list', async () => {
    const { service } = createService([
      moduleRecord({
        key: 'chat',
        name: '在线对话',
        visible: false,
      }),
    ]);

    const result = await service.listAdmin();
    const chat = result.items.find((item) => item.key === 'chat');

    expect(chat).toMatchObject({
      customized: true,
      name: '在线对话',
      visible: false,
    });
    expect(result.items.some((item) => item.key === 'home')).toBe(true);
  });

  it('falls back to the complete built-in catalog when the database is unavailable', async () => {
    const { moduleDisplayConfig, service } = createService();

    moduleDisplayConfig.findMany.mockRejectedValue(new Error('database offline'));

    const result = await service.listAdmin();

    expect(result.source).toBe('defaults');
    expect(result.items).toHaveLength(DEFAULT_MODULE_DISPLAY_CONFIGS.length);
    expect(result.items.every((item) => item.customized === false)).toBe(true);
  });

  it('creates a database override with defaults filled in', async () => {
    const { moduleDisplayConfig, service } = createService();

    moduleDisplayConfig.upsert.mockImplementation(
      ({ create }: { create: Record<string, unknown> }) =>
        Promise.resolve(moduleRecord({ ...create, id: 'created-module' })),
    );

    const result = await service.update('chat', {
      badge: 'HOT',
      visible: false,
    });

    expect(moduleDisplayConfig.upsert).toHaveBeenCalledWith({
      create: expect.objectContaining({
        badge: 'HOT',
        icon: 'chat',
        key: 'chat',
        name: '模型对话',
        route: '/chat',
        sortOrder: 20,
        visible: false,
      }),
      update: {
        badge: 'HOT',
        cover: undefined,
        group: undefined,
        icon: undefined,
        name: undefined,
        route: undefined,
        sortOrder: undefined,
        visible: false,
      },
      where: { key: 'chat' },
    });
    expect(result).toMatchObject({
      badge: 'HOT',
      customized: true,
      key: 'chat',
      visible: false,
    });
  });

  it('rejects unknown custom modules', async () => {
    const { service } = createService();

    await expect(service.update('missing-module', { visible: false })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
