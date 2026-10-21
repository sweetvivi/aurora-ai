import { defineStore } from 'pinia';
import { fetchModels, type ChatModel } from '@/app/api';

export type ModelCapability = ChatModel['capabilities'][number];

/** 生图场景：纯文生图 / 带参考图（可整体重绘）/ 需要保留原图的编辑。 */
export type ImageModelMode = 'text-to-image' | 'image-to-image' | 'image-edit';
/** 视频场景：与视频工作台的模式一一对应。 */
export type VideoModelMode =
  'text-to-video' | 'image-to-video' | 'first-last-frame' | 'reference-video';

export interface ModelCatalogItem extends ChatModel {
  capabilities: ModelCapability[];
}

/**
 * 判断模型能不能接住某个生图场景。
 *
 * - 图生图：至少要能吃 1 张参考图（maxReferenceImages > 0）
 * - 编辑：必须支持保真编辑（supportsImageEdit 未声明时按支持处理，避免老模型被误伤）
 */
export function matchesImageMode(model: ModelCatalogItem, mode: ImageModelMode): boolean {
  const profile = model.profile?.image;

  if (mode === 'text-to-image') {
    return true;
  }

  if (mode === 'image-to-image') {
    return (profile?.maxReferenceImages ?? 1) > 0;
  }

  return profile?.supportsImageEdit !== false;
}

/** 判断模型能不能接住某个视频场景；未声明的能力按不支持处理。 */
export function matchesVideoMode(model: ModelCatalogItem, mode: VideoModelMode): boolean {
  const profile = model.profile?.video;

  if (mode === 'text-to-video') {
    return true;
  }

  if (mode === 'image-to-video') {
    return profile?.supportsImageInput !== false;
  }

  if (mode === 'first-last-frame') {
    return profile?.supportsLastFrame === true;
  }

  return profile?.supportsVideoInput === true;
}

interface ModelCatalogState {
  error: string | null;
  items: ModelCatalogItem[];
  loaded: boolean;
  loading: boolean;
  source: 'api' | 'fallback';
}

const fallbackModels: ModelCatalogItem[] = [
  {
    alias: 'openai-gpt-6-astra',
    capabilities: ['chat', 'vision'],
    displayName: 'GPT-6 Astra',
  },
  {
    alias: 'openai-gpt-6-sol',
    capabilities: ['chat', 'vision'],
    displayName: 'GPT-6 Sol',
  },
  {
    alias: 'deepseek-v4-pro-0813',
    capabilities: ['chat'],
    displayName: 'DeepSeek V4 Pro',
  },
  {
    alias: 'deepseek-v4-1-flash-0910',
    capabilities: ['chat'],
    displayName: 'DeepSeek V4.1 Flash',
  },
  {
    alias: 'qwen-3-8-max',
    capabilities: ['chat'],
    displayName: 'Qwen 3.8 Max',
  },
  {
    alias: 'qwen-3-8-flash',
    capabilities: ['chat'],
    displayName: 'Qwen 3.8 Flash',
  },
  {
    alias: 'qwen-3-8-27b',
    capabilities: ['chat'],
    displayName: 'Qwen 3.8 27B',
  },
  {
    alias: 'qwen-3-8-max-0902',
    capabilities: ['chat'],
    displayName: 'Qwen 3.8 Max 0902',
  },
  {
    alias: 'jiguang-gpt-image-2.5',
    capabilities: ['image'],
    displayName: 'GPT Image 2.5',
    profile: {
      image: {
        maxReferenceImages: 10,
        sizePresets: ['1K', '2K', '4K'],
        supportsImageEdit: true,
      },
    },
  },
  {
    alias: 'xai-grok-imagine-image',
    capabilities: ['image'],
    displayName: 'Grok Imagine Image',
    profile: {
      image: {
        maxReferenceImages: 3,
        sizePresets: ['1K'],
        supportsImageEdit: false,
      },
    },
  },
  {
    alias: 'xai-grok-imagine-image-2.0',
    capabilities: ['image'],
    displayName: 'Grok Imagine Image 2.0',
    profile: {
      image: {
        maxReferenceImages: 3,
        sizePresets: ['1K'],
        supportsImageEdit: false,
      },
    },
  },
  {
    alias: 'xai-grok-imagine-video',
    capabilities: ['video'],
    displayName: 'Grok Imagine Video',
    profile: {
      video: {
        maxDuration: 15,
        resolutions: ['720P', '1080P'],
        supportsAudio: false,
        supportsImageInput: true,
        supportsLastFrame: false,
        supportsVideoInput: false,
      },
    },
  },
  {
    alias: 'xai-grok-imagine-video-1.5',
    capabilities: ['video'],
    displayName: 'Grok Imagine Video 1.5',
    profile: {
      video: {
        maxDuration: 15,
        resolutions: ['720P', '1080P'],
        supportsAudio: false,
        supportsImageInput: true,
        supportsLastFrame: false,
        supportsVideoInput: false,
      },
    },
  },
];

let loadPromise: Promise<void> | null = null;

export const useModelCatalogStore = defineStore('model-catalog', {
  state: (): ModelCatalogState => ({
    error: null,
    items: getFallbackModelItems(),
    loaded: false,
    loading: false,
    source: 'fallback',
  }),
  getters: {
    modelsFor:
      (state) =>
      (capability: ModelCapability): ModelCatalogItem[] =>
        state.items.filter((model) => model.capabilities.includes(capability)),
    resolveAlias:
      (state) =>
      (capability: ModelCapability, preferredAlias?: string): string => {
        const models = state.items.filter((model) => model.capabilities.includes(capability));

        if (preferredAlias && models.some((model) => model.alias === preferredAlias)) {
          return preferredAlias;
        }

        return models[0]?.alias ?? '';
      },
    imageModelsFor:
      (state) =>
      (mode: ImageModelMode): ModelCatalogItem[] =>
        state.items.filter(
          (model) => model.capabilities.includes('image') && matchesImageMode(model, mode),
        ),
    videoModelsFor:
      (state) =>
      (mode: VideoModelMode): ModelCatalogItem[] =>
        state.items.filter(
          (model) => model.capabilities.includes('video') && matchesVideoMode(model, mode),
        ),
    resolveImageAlias:
      (state) =>
      (mode: ImageModelMode, preferredAlias?: string): string => {
        const models = state.items.filter(
          (model) => model.capabilities.includes('image') && matchesImageMode(model, mode),
        );

        if (preferredAlias && models.some((model) => model.alias === preferredAlias)) {
          return preferredAlias;
        }

        return models[0]?.alias ?? '';
      },
    resolveVideoAlias:
      (state) =>
      (mode: VideoModelMode, preferredAlias?: string): string => {
        const models = state.items.filter(
          (model) => model.capabilities.includes('video') && matchesVideoMode(model, mode),
        );

        if (preferredAlias && models.some((model) => model.alias === preferredAlias)) {
          return preferredAlias;
        }

        return models[0]?.alias ?? '';
      },
  },
  actions: {
    async load(force = false): Promise<void> {
      if (this.loaded && !force) {
        return;
      }

      if (loadPromise) {
        return loadPromise;
      }

      loadPromise = this.fetchCatalog();
      return loadPromise;
    },
    async fetchCatalog(): Promise<void> {
      this.loading = true;
      this.error = null;

      try {
        const models = normalizeModels(await fetchModels());

        this.items = models.length > 0 ? models : getFallbackModelItems();
        this.source = models.length > 0 ? 'api' : 'fallback';
        this.loaded = true;
      } catch (error) {
        this.items = getFallbackModelItems();
        this.source = 'fallback';
        this.loaded = true;
        this.error = error instanceof Error ? error.message : '模型目录加载失败';
      } finally {
        this.loading = false;
        loadPromise = null;
      }
    },
  },
});

export function getFallbackModelItems(): ModelCatalogItem[] {
  return fallbackModels.map((model) => ({
    ...model,
    capabilities: [...model.capabilities],
    profile: cloneModelProfile(model.profile),
  }));
}

export function normalizeModels(models: ChatModel[]): ModelCatalogItem[] {
  const byAlias = new Map<string, ModelCatalogItem>();

  for (const model of models) {
    const alias = model.alias.trim();
    const displayName = model.displayName.trim();

    if (!alias || !displayName) {
      continue;
    }

    const capabilities = model.capabilities.filter(isSupportedCapability);
    const existing = byAlias.get(alias);

    if (existing) {
      existing.capabilities = Array.from(new Set([...existing.capabilities, ...capabilities]));
      existing.displayName = displayName;
      existing.profile = mergeModelProfiles(existing.profile, model.profile);
      continue;
    }

    byAlias.set(alias, {
      alias,
      capabilities: Array.from(new Set(capabilities)),
      displayName,
      profile: cloneModelProfile(model.profile),
    });
  }

  return Array.from(byAlias.values()).sort(
    (left, right) =>
      left.displayName.localeCompare(right.displayName) || left.alias.localeCompare(right.alias),
  );
}

function isSupportedCapability(capability: string): capability is ModelCapability {
  return (
    capability === 'chat' ||
    capability === 'image' ||
    capability === 'video' ||
    capability === 'vision'
  );
}

function cloneModelProfile(profile: ChatModel['profile']): ChatModel['profile'] | undefined {
  if (!profile) {
    return undefined;
  }

  return {
    ...(profile.image
      ? {
          image: {
            ...profile.image,
            sizePresets: [...profile.image.sizePresets],
          },
        }
      : {}),
    ...(profile.video
      ? {
          video: {
            ...profile.video,
            resolutions: [...profile.video.resolutions],
          },
        }
      : {}),
  };
}

function mergeModelProfiles(
  current: ChatModel['profile'],
  incoming: ChatModel['profile'],
): ChatModel['profile'] | undefined {
  if (!current) {
    return cloneModelProfile(incoming);
  }

  if (!incoming) {
    return cloneModelProfile(current);
  }

  return {
    ...(current.image || incoming.image
      ? {
          image: {
            maxReferenceImages: Math.max(
              current.image?.maxReferenceImages ?? 0,
              incoming.image?.maxReferenceImages ?? 0,
            ),
            sizePresets: Array.from(
              new Set([
                ...(current.image?.sizePresets ?? []),
                ...(incoming.image?.sizePresets ?? []),
              ]),
            ),
            supportsLayerDecomposition: mergeCapabilityFlag(
              current.image?.supportsLayerDecomposition,
              incoming.image?.supportsLayerDecomposition,
            ),
            supportsSequentialGeneration: mergeCapabilityFlag(
              current.image?.supportsSequentialGeneration,
              incoming.image?.supportsSequentialGeneration,
            ),
          },
        }
      : {}),
    ...(current.video || incoming.video
      ? {
          video: {
            maxDuration: Math.max(
              current.video?.maxDuration ?? 0,
              incoming.video?.maxDuration ?? 0,
            ),
            resolutions: Array.from(
              new Set([
                ...(current.video?.resolutions ?? []),
                ...(incoming.video?.resolutions ?? []),
              ]),
            ),
            supportsAudio: mergeCapabilityFlag(
              current.video?.supportsAudio,
              incoming.video?.supportsAudio,
            ),
            supportsLastFrame: mergeCapabilityFlag(
              current.video?.supportsLastFrame,
              incoming.video?.supportsLastFrame,
            ),
            supportsVideoInput: mergeCapabilityFlag(
              current.video?.supportsVideoInput,
              incoming.video?.supportsVideoInput,
            ),
          },
        }
      : {}),
  };
}

function mergeCapabilityFlag(
  current: boolean | undefined,
  incoming: boolean | undefined,
): boolean | undefined {
  if (current === true || incoming === true) {
    return true;
  }

  if (current === false || incoming === false) {
    return false;
  }

  return undefined;
}
