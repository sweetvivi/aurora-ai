import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import { useAgentWorkspaceStore } from './agent-workspace';

describe('agent workspace store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    window.localStorage.clear();
  });

  it('restores favorites and published agents in a new store instance', () => {
    const store = useAgentWorkspaceStore();

    store.toggleFavorite('visual-prompt');
    store.publishDraft({
      description: '整理产品需求并输出验收清单。',
      id: 'custom-product-helper',
      instructions: '先澄清目标，再输出结构化结果。',
      name: '产品验收助手',
      opening: '告诉我产品目标，我会整理验收范围。',
      published: false,
      starterPrompts: ['整理验收清单'],
      tags: ['产品', '验收'],
    });

    setActivePinia(createPinia());

    const restoredStore = useAgentWorkspaceStore();

    expect(restoredStore.favoriteAgentIds).toEqual(['visual-prompt']);
    expect(restoredStore.customAgents).toEqual([
      expect.objectContaining({
        category: '我的智能体',
        id: 'custom-product-helper',
        name: '产品验收助手',
      }),
    ]);
  });
});
