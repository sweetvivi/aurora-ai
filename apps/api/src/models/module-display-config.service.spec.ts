import { NotFoundException } from '@nestjs/common';
import type { SaveFileInput, StorageAdapter, StoredFile } from '../storage/storage.types';
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
    coverStorageKey: null,
    createdAt: new Date('2026-10-17T00:00:00.000Z'),
    group: 'primary',
    icon: 'chat',
    id: 'module-record-1',
    key: 'chat',
    name: '模型对话',
    route: '/newchat',
    sortOrder: 20,
    subtitle: '100+大模型',
    updatedAt: new Date('2026-10-17T00:00:00.000Z'),
    visible: true,
    ...overrides,
  };
}

function createService(records: unknown[] = [], storage = new MemoryStorageAdapter()) {
  const moduleDisplayConfig = {
    findMany: vi.fn().mockResolvedValue(records),
    findUnique: vi.fn().mockResolvedValue(null),
    upsert: vi.fn(),
  };
  const service = new ModuleDisplayConfigService(
    {
      moduleDisplayConfig,
    } as unknown as PrismaService,
    storage,
  );

  return {
    moduleDisplayConfig,
    service,
    storage,
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
        route: '/newchat',
        sortOrder: 20,
        visible: false,
      }),
      update: {
        badge: 'HOT',
        cover: undefined,
        coverStorageKey: undefined,
        group: undefined,
        icon: undefined,
        name: undefined,
        route: undefined,
        sortOrder: undefined,
        subtitle: undefined,
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

  it('serves uploaded module covers through a stable public URL', async () => {
    const { service } = createService([
      moduleRecord({
        cover: 'https://cdn.example/old-cover.png',
        coverStorageKey: 'users/admin/2026/10/cover.png',
      }),
    ]);

    const result = await service.listAdmin();
    const chat = result.items.find((item) => item.key === 'chat');

    expect(chat).toMatchObject({
      coverSource: 'local',
    });
    expect(chat?.cover).toMatch(/^\/api\/v1\/modules\/display\/chat\/cover\?v=\d+$/);
  });

  it('removes the old local file when switching back to an external cover URL', async () => {
    const previousStorageKey = 'users/admin/2026/10/previous.png';
    const { moduleDisplayConfig, service, storage } = createService([
      moduleRecord({
        coverStorageKey: previousStorageKey,
      }),
    ]);

    moduleDisplayConfig.findUnique.mockResolvedValue(
      moduleRecord({
        coverStorageKey: previousStorageKey,
      }),
    );
    moduleDisplayConfig.upsert.mockResolvedValue(
      moduleRecord({
        cover: 'https://cdn.example/new-cover.webp',
      }),
    );

    const result = await service.update('chat', {
      cover: ' https://cdn.example/new-cover.webp ',
    });

    expect(moduleDisplayConfig.upsert).toHaveBeenCalledWith({
      create: expect.objectContaining({
        cover: 'https://cdn.example/new-cover.webp',
        coverStorageKey: null,
      }),
      update: {
        badge: undefined,
        cover: 'https://cdn.example/new-cover.webp',
        coverStorageKey: null,
        group: undefined,
        icon: undefined,
        name: undefined,
        route: undefined,
        sortOrder: undefined,
        subtitle: undefined,
        visible: undefined,
      },
      where: { key: 'chat' },
    });
    expect(storage.deletedKeys).toEqual([previousStorageKey]);
    expect(result).toMatchObject({
      cover: 'https://cdn.example/new-cover.webp',
      coverSource: 'url',
    });
  });

  it('updates the navigation subtitle without requiring a new database record', async () => {
    const { moduleDisplayConfig, service } = createService();

    moduleDisplayConfig.upsert.mockImplementation(
      ({ create }: { create: Record<string, unknown> }) =>
        Promise.resolve(moduleRecord({ ...create, id: 'created-module' })),
    );

    const result = await service.update('chat', {
      subtitle: ' 100+大模型 ',
    });

    expect(moduleDisplayConfig.upsert).toHaveBeenCalledWith({
      create: expect.objectContaining({
        subtitle: '100+大模型',
      }),
      update: {
        badge: undefined,
        cover: undefined,
        coverStorageKey: undefined,
        group: undefined,
        icon: undefined,
        name: undefined,
        route: undefined,
        sortOrder: undefined,
        subtitle: '100+大模型',
        visible: undefined,
      },
      where: { key: 'chat' },
    });
    expect(result.subtitle).toBe('100+大模型');
  });

  it('stores uploaded cover files and replaces the previous local file', async () => {
    const previousStorageKey = 'users/admin/2026/10/previous.png';
    const { moduleDisplayConfig, service, storage } = createService([], storageFixture());

    moduleDisplayConfig.findUnique.mockResolvedValue(
      moduleRecord({
        coverStorageKey: previousStorageKey,
      }),
    );
    moduleDisplayConfig.upsert.mockImplementation(
      ({ create }: { create: Record<string, unknown> }) =>
        Promise.resolve(moduleRecord({ ...create, id: 'created-module' })),
    );

    const result = await service.uploadCover('chat', 'admin-1', {
      buffer: PNG_BUFFER,
      mimetype: 'image/png',
      originalname: 'cover.png',
      size: PNG_BUFFER.length,
    });

    expect(storage.savedInputs).toHaveLength(1);
    expect(storage.savedInputs[0]).toMatchObject({
      extension: 'png',
      mimeType: 'image/png',
      originalName: 'cover.png',
      userId: 'admin-1',
    });
    const storedFile = storage.storedFiles[0];
    expect(storedFile).toBeDefined();
    expect(moduleDisplayConfig.upsert).toHaveBeenCalledWith({
      create: expect.objectContaining({
        cover: null,
        coverStorageKey: storedFile?.storageKey,
      }),
      update: {
        cover: null,
        coverStorageKey: storedFile?.storageKey,
      },
      where: { key: 'chat' },
    });
    expect(storage.deletedKeys).toEqual([previousStorageKey]);
    expect(result.coverSource).toBe('local');
    expect(result.cover).toContain('/api/v1/modules/display/chat/cover?v=');
  });
});

const PNG_BUFFER = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);

function storageFixture(): MemoryStorageAdapter {
  return new MemoryStorageAdapter();
}

class MemoryStorageAdapter implements StorageAdapter {
  readonly deletedKeys: string[] = [];
  readonly savedInputs: SaveFileInput[] = [];
  readonly storedFiles: StoredFile[] = [];
  private counter = 0;

  async delete(storageKey: string): Promise<void> {
    this.deletedKeys.push(storageKey);
  }

  async read(): Promise<Buffer> {
    return PNG_BUFFER;
  }

  async save(input: SaveFileInput): Promise<StoredFile> {
    this.counter += 1;
    const stored = {
      checksum: `checksum-${this.counter}`,
      size: input.buffer.length,
      storageKey: `test/cover-${this.counter}.${input.extension}`,
    };

    this.savedInputs.push(input);
    this.storedFiles.push(stored);
    return stored;
  }
}
