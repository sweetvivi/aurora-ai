import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiMocks = vi.hoisted(() => ({
  fetchModels: vi.fn(),
}));

vi.mock('@/app/api', async () => {
  const actual = await vi.importActual<typeof import('@/app/api')>('@/app/api');

  return {
    ...actual,
    ...apiMocks,
  };
});

import { normalizeModels, useModelCatalogStore } from './model-catalog';

describe('model catalog store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('starts with backend-compatible fallback models', () => {
    const store = useModelCatalogStore();

    expect(store.modelsFor('image').map((model) => model.alias)).toContain('jiguang-gpt-image-2.5');
    expect(store.modelsFor('video').length).toBeGreaterThanOrEqual(2);
  });

  it('loads, deduplicates and caches the live catalog', async () => {
    apiMocks.fetchModels.mockResolvedValue([
      {
        alias: 'image-live',
        capabilities: ['image'],
        displayName: 'Live Image',
        profile: {
          image: {
            maxReferenceImages: 10,
            sizePresets: ['1K', '2K'],
          },
        },
      },
      {
        alias: 'image-live',
        capabilities: ['video'],
        displayName: 'Live Image Updated',
        profile: {
          video: {
            maxDuration: 15,
            resolutions: ['720P', '1080P'],
            supportsLastFrame: false,
          },
        },
      },
      {
        alias: 'unsupported',
        capabilities: ['embedding'],
        displayName: 'Embedding Only',
      },
    ]);

    const store = useModelCatalogStore();
    await store.load();
    await store.load();

    expect(apiMocks.fetchModels).toHaveBeenCalledTimes(1);
    expect(store.source).toBe('api');
    expect(store.modelsFor('image')).toHaveLength(1);
    expect(store.modelsFor('video')[0]).toMatchObject({
      alias: 'image-live',
      capabilities: ['image', 'video'],
      displayName: 'Live Image Updated',
      profile: {
        image: {
          maxReferenceImages: 10,
          sizePresets: ['1K', '2K'],
        },
        video: {
          maxDuration: 15,
          resolutions: ['720P', '1080P'],
          supportsLastFrame: false,
        },
      },
    });
    expect(store.modelsFor('chat')).toHaveLength(0);
  });

  it('preserves explicit unsupported capability flags across partial records', () => {
    const state = useModelCatalogStore();
    state.items = normalizeModels([
      {
        alias: 'video-partial',
        capabilities: ['video', 'image'],
        displayName: 'Partial Video',
        profile: {
          image: {
            maxReferenceImages: 10,
            sizePresets: ['1K', '2K'],
            supportsLayerDecomposition: false,
            supportsSequentialGeneration: true,
          },
          video: {
            maxDuration: 12,
            resolutions: ['720P'],
            supportsAudio: false,
            supportsLastFrame: false,
            supportsVideoInput: false,
          },
        },
      },
      {
        alias: 'video-partial',
        capabilities: ['video', 'image'],
        displayName: 'Partial Video Updated',
        profile: {
          image: {
            maxReferenceImages: 14,
            sizePresets: ['4K'],
          },
          video: {
            maxDuration: 15,
            resolutions: ['1080P'],
          },
        },
      },
    ]);

    expect(state.modelsFor('video')[0]?.profile).toMatchObject({
      image: {
        maxReferenceImages: 14,
        sizePresets: ['1K', '2K', '4K'],
        supportsLayerDecomposition: false,
        supportsSequentialGeneration: true,
      },
      video: {
        maxDuration: 15,
        resolutions: ['720P', '1080P'],
        supportsAudio: false,
        supportsLastFrame: false,
        supportsVideoInput: false,
      },
    });
  });

  it('keeps capability flags unknown when neither record declares them', () => {
    const state = useModelCatalogStore();
    state.items = normalizeModels([
      {
        alias: 'video-unknown',
        capabilities: ['video'],
        displayName: 'Unknown Video',
        profile: {
          video: {
            maxDuration: 10,
            resolutions: ['720P'],
          },
        },
      },
      {
        alias: 'video-unknown',
        capabilities: ['video'],
        displayName: 'Unknown Video Updated',
        profile: {
          video: {
            maxDuration: 12,
            resolutions: ['1080P'],
          },
        },
      },
    ]);

    expect(state.modelsFor('video')[0]?.profile?.video).toMatchObject({
      supportsAudio: undefined,
      supportsLastFrame: undefined,
      supportsVideoInput: undefined,
    });
  });

  it('uses fallback models when the API is unavailable', async () => {
    apiMocks.fetchModels.mockRejectedValue(new Error('api offline'));

    const store = useModelCatalogStore();
    await store.load();

    expect(store.source).toBe('fallback');
    expect(store.error).toBe('api offline');
    expect(store.modelsFor('image').map((model) => model.alias)).toContain('jiguang-gpt-image-2.5');
  });

  it('replaces stale aliases with the first model for the requested capability', async () => {
    apiMocks.fetchModels.mockResolvedValue([
      {
        alias: 'image-current',
        capabilities: ['image'],
        displayName: 'Current Image',
      },
      {
        alias: 'video-current',
        capabilities: ['video'],
        displayName: 'Current Video',
      },
    ]);

    const store = useModelCatalogStore();
    await store.load();

    expect(store.resolveAlias('image', 'image-current')).toBe('image-current');
    expect(store.resolveAlias('image', 'canvas-aurora-3')).toBe('image-current');
    expect(store.resolveAlias('video', 'aurora-video-3')).toBe('video-current');
  });

  it('refreshes the catalog when requested', async () => {
    apiMocks.fetchModels
      .mockResolvedValueOnce([
        {
          alias: 'image-old',
          capabilities: ['image'],
          displayName: 'Old Image',
        },
      ])
      .mockResolvedValueOnce([
        {
          alias: 'image-new',
          capabilities: ['image'],
          displayName: 'New Image',
        },
      ]);

    const store = useModelCatalogStore();

    await store.load();
    await store.load(true);

    expect(apiMocks.fetchModels).toHaveBeenCalledTimes(2);
    expect(store.modelsFor('image')[0]?.alias).toBe('image-new');
  });
});
