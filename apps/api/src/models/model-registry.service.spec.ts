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

  it('keeps Seedance out of the default registry until it is actually wired', () => {
    // 豆包 Seedream / Seedance 尚未接入：没有密钥，网关也没有火山方舟的 /api/v3 路径。
    // 这里锁住「不再注册」这个决定，避免以后误加回可选列表。
    const registry = createRegistry();
    const aliases = registry.list().map((model) => model.alias);

    expect(aliases).not.toContain('doubao-seedance-1-0-pro');
    expect(aliases).not.toContain('doubao-seedance-2-0');
    expect(aliases).not.toContain('doubao-seedream-4-0');
  });

  it('registers Grok image models as reference-capable but not edit-capable', () => {
    const registry = createRegistry();
    const model = registry.getByAlias('xai-grok-imagine-image');

    expect(model).toMatchObject({
      capabilities: ['image'],
      providerCode: 'xai',
      providerModel: 'grok-imagine-image',
      profile: {
        image: {
          maxReferenceImages: 3,
          sizePresets: ['1K'],
          supportsImageEdit: false,
        },
      },
    });
    expect(registry.getByAlias('xai-grok-imagine-image-2.0')).toMatchObject({
      providerModel: 'grok-imagine-image-2.0',
    });
  });

  it('marks video models with first-frame input support', () => {
    const registry = createRegistry();

    for (const alias of ['xai-grok-imagine-video', 'xai-grok-imagine-video-1.5']) {
      expect(registry.getByAlias(alias).profile?.video?.supportsImageInput).toBe(true);
      expect(registry.getByAlias(alias).profile?.video?.supportsLastFrame).toBe(false);
    }
  });

  it('loads enabled database models and keeps provider connection metadata', async () => {
    const registry = createRegistry({}, [
      {
        alias: 'database-chat',
        capabilities: ['CHAT'],
        displayName: 'Database Chat',
        enabled: true,
        provider: {
          baseUrl: 'https://provider.example/v1',
          code: 'database-provider',
          enabled: true,
          keyRef: 'DATABASE_PROVIDER_KEY',
        },
        providerModel: 'provider-chat-v1',
      },
    ]);

    await expect(registry.reload()).resolves.toEqual({
      count: 14,
      source: 'database',
    });
    expect(registry.list()).toEqual(
      expect.arrayContaining([
        {
          alias: 'database-chat',
          baseUrl: 'https://provider.example/v1',
          capabilities: ['chat'],
          displayName: 'Database Chat',
          keyRef: 'DATABASE_PROVIDER_KEY',
          providerCode: 'database-provider',
          providerModel: 'provider-chat-v1',
        },
      ]),
    );
    expect(registry.list()).toHaveLength(14);
  });

  it('lets an enabled database model override the default alias', async () => {
    const registry = createRegistry({}, [
      {
        alias: 'openai-gpt-6-astra',
        capabilities: ['chat'],
        displayName: 'Database GPT',
        enabled: true,
        provider: {
          baseUrl: 'https://provider.example/v1',
          code: 'database-provider',
          enabled: true,
          keyRef: 'DATABASE_PROVIDER_KEY',
        },
        providerModel: 'database-gpt-v1',
      },
    ]);

    await registry.reload();

    expect(registry.getByAlias('openai-gpt-6-astra')).toMatchObject({
      displayName: 'Database GPT',
      providerCode: 'database-provider',
      providerModel: 'database-gpt-v1',
    });
    expect(registry.list().filter((model) => model.alias === 'openai-gpt-6-astra')).toHaveLength(1);
  });

  it('keeps a disabled database override from falling back to the default alias', async () => {
    const registry = createRegistry({}, [
      {
        alias: 'openai-gpt-6-astra',
        capabilities: ['chat'],
        displayName: 'Disabled GPT',
        enabled: false,
        provider: {
          baseUrl: 'https://provider.example/v1',
          code: 'database-provider',
          enabled: true,
          keyRef: 'DATABASE_PROVIDER_KEY',
        },
        providerModel: 'database-gpt-v1',
      },
    ]);

    await registry.reload();

    expect(() => registry.getByAlias('openai-gpt-6-astra')).toThrow();
    expect(registry.list()).toHaveLength(12);
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
        alias: 'seedance-1-0-pro',
        capabilities: ['video'],
        providerCode: 'volcengine',
        providerModel: 'doubao-seedance-1-0-pro-250528',
      }),
    ).toMatchObject({
      video: {
        maxDuration: 12,
        resolutions: ['480P', '720P', '1080P'],
        supportsAudio: false,
        supportsLastFrame: true,
        supportsVideoInput: false,
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
        supportsVideoInput: false,
      },
    });

    expect(
      resolveModelCapabilityProfile({
        alias: 'seedance-2-0',
        capabilities: ['video'],
        providerCode: 'volcengine',
        providerModel: 'doubao-seedance-2-0-260128',
      }),
    ).toMatchObject({
      video: {
        maxDuration: 15,
        resolutions: ['480P', '720P', '1080P', '4K'],
        supportsAudio: false,
        supportsLastFrame: true,
        supportsVideoInput: true,
      },
    });

    expect(
      resolveModelCapabilityProfile({
        alias: 'seedance-2-0-fast',
        capabilities: ['video'],
        providerCode: 'volcengine',
        providerModel: 'doubao-seedance-2-0-fast-260128',
      }),
    ).toMatchObject({
      video: {
        maxDuration: 15,
        resolutions: ['480P', '720P'],
        supportsAudio: false,
        supportsLastFrame: true,
        supportsVideoInput: true,
      },
    });

    expect(
      resolveModelCapabilityProfile({
        alias: 'seedance-2-0-mini',
        capabilities: ['video'],
        providerCode: 'volcengine',
        providerModel: 'doubao-seedance-2-0-mini-260615',
      }),
    ).toMatchObject({
      video: {
        maxDuration: 15,
        resolutions: ['480P', '720P'],
        supportsAudio: false,
        supportsLastFrame: true,
        supportsVideoInput: true,
      },
    });

    expect(
      resolveModelCapabilityProfile({
        alias: 'seedance-2-5',
        capabilities: ['video'],
        providerCode: 'volcengine',
        providerModel: 'doubao-seedance-2-5-260628',
      }),
    ).toMatchObject({
      video: {
        maxDuration: 30,
        resolutions: ['480P', '720P', '1080P'],
        supportsAudio: false,
        supportsLastFrame: true,
        supportsVideoInput: true,
      },
    });
  });

  it('uses the documented broad Seedance fallback for unknown endpoint mappings', () => {
    expect(
      resolveModelCapabilityProfile({
        alias: 'seedance-custom-endpoint',
        capabilities: ['video'],
        providerCode: 'volcengine',
        providerModel: 'ep-custom-seedance',
      }),
    ).toMatchObject({
      video: {
        maxDuration: 30,
        resolutions: ['480P', '720P', '1080P', '4K'],
        supportsAudio: false,
        supportsLastFrame: true,
        supportsVideoInput: true,
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
