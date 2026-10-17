import { describe, expect, it } from 'vitest';
import { buildGeneratedAgentCatalog } from './agent-directory';

describe('buildGeneratedAgentCatalog', () => {
  it('builds the reference-scale official catalog without duplicate ids', () => {
    const catalog = buildGeneratedAgentCatalog([]);

    expect(catalog).toHaveLength(6358);
    expect(new Set(catalog.map((agent) => agent.id)).size).toBe(6358);
    expect(new Set(catalog.map((agent) => agent.name)).size).toBeGreaterThan(6000);
  });

  it('keeps category totals aligned with the reference navigation counts', () => {
    const catalog = buildGeneratedAgentCatalog([]);

    expect(catalog.filter((agent) => agent.category === '教育与培训')).toHaveLength(603);
    expect(catalog.filter((agent) => agent.category === 'AI 视觉创作')).toHaveLength(370);
    expect(catalog.filter((agent) => agent.category === '编程与软件开发')).toHaveLength(240);
    expect(catalog.filter((agent) => agent.category === 'AI 电商')).toHaveLength(250);
    expect(catalog.filter((agent) => agent.category === 'AI 图片')).toHaveLength(275);
  });

  it('is deterministic and trims a smaller target consistently', () => {
    const first = buildGeneratedAgentCatalog([], 120);
    const second = buildGeneratedAgentCatalog([], 120);

    expect(first).toEqual(second);
    expect(first).toHaveLength(120);
    expect(first[0]?.id).toBe('official-01-0001');
    expect(first.at(-1)?.id).toBe('official-01-0120');
  });
});
