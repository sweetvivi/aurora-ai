import { defineStore } from 'pinia';
import { fetchModels, type ChatModel } from '@/app/api';

export type ModelCapability = ChatModel['capabilities'][number];

export interface ModelCatalogItem extends ChatModel {
  capabilities: ModelCapability[];
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
  },
  {
    alias: 'xai-grok-imagine-video',
    capabilities: ['video'],
    displayName: 'Grok Imagine Video',
  },
  {
    alias: 'xai-grok-imagine-video-1.5',
    capabilities: ['video'],
    displayName: 'Grok Imagine Video 1.5',
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
      continue;
    }

    byAlias.set(alias, {
      alias,
      capabilities: Array.from(new Set(capabilities)),
      displayName,
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
