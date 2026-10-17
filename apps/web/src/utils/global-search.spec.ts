import { describe, expect, it } from 'vitest';
import {
  getFallbackModuleItems,
  getModulePresentation,
  type ModuleCatalogItem,
} from '@/stores/module-catalog';
import { buildGlobalSearchEntries, searchGlobalEntries } from './global-search';

const catalogItems: ModuleCatalogItem[] = getFallbackModuleItems().map((item) => ({
  ...item,
  presentation: getModulePresentation(item.key),
}));
const entries = buildGlobalSearchEntries(catalogItems);

describe('global search', () => {
  it('matches module aliases used in everyday tasks', () => {
    expect(searchGlobalEntries(entries, '文生图')[0]?.title).toBe('AI 绘画');
    expect(searchGlobalEntries(entries, '抠图')[0]?.title).toBe('智能修图');
    expect(searchGlobalEntries(entries, '做视频')[0]?.title).toBe('视频生成');
    expect(searchGlobalEntries(entries, '商品图')[0]?.title).toBe('电商工具');
    expect(searchGlobalEntries(entries, '工作流')[0]?.title).toBe('AI 画布');
  });

  it('keeps the catalog order for an empty query and ranks exact titles first', () => {
    expect(searchGlobalEntries(entries, '')).toHaveLength(entries.length);
    expect(searchGlobalEntries(entries, '模型对话')[0]?.title).toBe('模型对话');
  });

  it('returns no entries for unknown terms', () => {
    expect(searchGlobalEntries(entries, '不存在的功能')).toEqual([]);
  });
});
