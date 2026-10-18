import { ConfigService } from '@nestjs/config';
import type { PrismaService } from '../infrastructure/prisma/prisma.service';
import { describe, expect, it, vi } from 'vitest';
import { ModelRegistryService, resolveModelCapabilityProfile } from './model-registry.service';

function createRegistry(
  config: Record<string, unknown> = {},
  records: unknown[] = [],
): ModelRegistryService {
  const prisma = {
    modelConfig: {
      findMany: vi.fn().mockResolvedValue(records),
    },
  } as unknown as PrismaService;

  return new ModelRegistryService(new ConfigService(config), prisma);
}

describe('model registry', () => {
  it('registers at least four currently available chat models across provider groups', () => {
    const registry = createRegistry();
    const chatModels = registry.list().filter((model) => model.capabilities.includes('chat'));
    const providerCodes = new Set(chatModels.map((model) => model.providerCode));
    const qwenModels = chatModels.filter((model) => model.providerCode === 'qwen');

    expect(chatModels).toHaveLength(8);
    expect(providerCodes).toEqual(new Set(['deepseek', 'jiguang', 'qwen']));
    expect(qwenModels).toHaveLength(4);
    expect(new Set(chatModels.map((model) => model.alias)).size).toBe(chatModels.length);
  });

  it('keeps model aliases separate from provider model identifiers', () => {
    const registry = createRegistry({ LLM_DEFAULT_MODEL: 'deepseek-v4-pro-0813' });

    expect(registry.getDefaultChatModel()).toMatchObject({
      alias: 'deepseek-v4-pro-0813',
      providerCode: 'deepseek',
      providerModel: 'deepseek-v4-pro-0813',
    });
  });

  it('loads enabled database models and keeps provider connection metadata', async () => {
    const registry = createRegistry({}, [
      {
        alias: 'database-chat',
        capabilities: ['CHAT'],
        displayName: 'Database Chat',
        provider: {
          baseUrl: 'https://provider.example/v1',
          code: 'database-provider',
          keyRef: 'DATABASE_PROVIDER_KEY',
        },
        providerModel: 'provider-chat-v1',
      },
    ]);

    await expect(registry.reload()).resolves.toEqual({
      count: 1,
      source: 'database',
    });
    expect(registry.list()).toEqual([
      {
        alias: 'database-chat',
        baseUrl: 'https://provider.example/v1',
        capabilities: ['chat'],
        displayName: 'Database Chat',
        keyRef: 'DATABASE_PROVIDER_KEY',
        providerCode: 'database-provider',
        providerModel: 'provider-chat-v1',
      },
    ]);
  });

  it('derives capability profiles for known image and video model families', () => {
    expect(
      resolveModelCapabilityProfile({
        alias: 'seedream-5-lite',
        capabilities: ['image'],
        providerCode: 'volcengine',
        providerModel: 'doubao-seedream-5-0-lite-260128',
      }),
    ).toMatchObject({
      image: {
        maxReferenceImages: 14,
        sizePresets: ['2K', '3K', '4K'],
        supportsSequentialGeneration: true,
      },
    });

    expect(
      resolveModelCapabilityProfile({
        alias: 'seedance-1-5-pro',
        capabilities: ['video'],
        providerCode: 'volcengine',
        providerModel: 'doubao-seedance-1-5-pro-250528',
      }),
    ).toMatchObject({
      video: {
        maxDuration: 12,
        resolutions: ['480P', '720P', '1080P'],
        supportsAudio: true,
        supportsLastFrame: true,
      },
    });
  });

  it('does not assign capability profiles to unrelated model families', () => {
    expect(
      resolveModelCapabilityProfile({
        alias: 'unknown-image',
        capabilities: ['image'],
        providerCode: 'custom-provider',
        providerModel: 'custom-image-v1',
      }),
    ).toBeUndefined();

    expect(
      resolveModelCapabilityProfile({
        alias: 'volcengine-generic-image',
        capabilities: ['image'],
        providerCode: 'volcengine',
        providerModel: 'generic-image-v1',
      }),
    ).toBeUndefined();

    expect(
      resolveModelCapabilityProfile({
        alias: 'volcengine-generic-video',
        capabilities: ['video'],
        providerCode: 'volcengine',
        providerModel: 'generic-video-v1',
      }),
    ).toBeUndefined();
  });

  it('falls back to defaults when the database has no enabled models', async () => {
    const registry = createRegistry();

    await expect(registry.reload()).resolves.toMatchObject({
      count: expect.any(Number),
      source: 'defaults',
    });
    expect(registry.list()).toHaveLength(13);
  });

  it('falls back to defaults when the initial database load fails', async () => {
    const prisma = {
      modelConfig: {
        findMany: vi.fn().mockRejectedValue(new Error('database offline')),
      },
    } as unknown as PrismaService;
    const registry = new ModelRegistryService(new ConfigService({}), prisma);

    await expect(registry.reload()).resolves.toMatchObject({
      count: 13,
      source: 'defaults',
    });
    expect(registry.getByAlias('openai-gpt-6-astra').providerModel).toBe('gpt-6-astra');
  });
});
