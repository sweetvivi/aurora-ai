import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiMocks = vi.hoisted(() => ({
  fetchModuleDisplayConfigs: vi.fn(),
}));

vi.mock('@/app/api', async () => {
  const actual = await vi.importActual<typeof import('@/app/api')>('@/app/api');

  return {
    ...actual,
    ...apiMocks,
  };
});

import { useModuleCatalogStore } from './module-catalog';

describe('module catalog store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('starts with a complete fallback navigation', () => {
    const store = useModuleCatalogStore();

    expect(store.visibleModules.length).toBeGreaterThanOrEqual(10);
    expect(store.visibleModules.map((item) => item.key)).toContain('chat');
  });

  it('merges database overrides into the public catalog', async () => {
    apiMocks.fetchModuleDisplayConfigs.mockResolvedValue({
      items: [
        {
          badge: 'NEW',
          cover: null,
          customized: true,
          group: 'primary',
          icon: 'chat',
          key: 'chat',
          name: '在线对话',
          route: '/chat',
          sortOrder: 5,
          subtitle: '100+大模型',
          visible: true,
        },
        {
          badge: null,
          cover: null,
          customized: true,
          group: 'primary',
          icon: 'home',
          key: 'home',
          name: '首页',
          route: '/',
          sortOrder: 10,
          subtitle: null,
          visible: true,
        },
      ],
      source: 'database',
    });

    const store = useModuleCatalogStore();
    await store.load();

    expect(store.source).toBe('database');
    expect(store.visibleModules[0]).toMatchObject({
      badge: 'NEW',
      key: 'chat',
      name: '在线对话',
      subtitle: '100+大模型',
    });
  });

  it('keeps built-in navigation when the API is unavailable', async () => {
    apiMocks.fetchModuleDisplayConfigs.mockRejectedValue(new Error('api offline'));

    const store = useModuleCatalogStore();
    await store.load();

    expect(store.source).toBe('defaults');
    expect(store.error).toBe('api offline');
    expect(store.visibleModules.map((item) => item.key)).toContain('draw');
  });
});
