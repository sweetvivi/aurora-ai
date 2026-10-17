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

    const expectedCounts = {
      AI教育: 546,
      AI视觉创作: 317,
      图形与图像处理: 323,
      办公文档生成: 482,
      数据计算与分析: 526,
      知识检索与信息获取: 408,
      编程与软件开发: 206,
      创意营销与内容策划: 315,
      学术与研究辅助: 218,
      教育与培训: 461,
      语言与文字处理: 389,
      商务与运营支持: 284,
      生活与娱乐: 405,
      产品与UI设计: 261,
      媒体与传播: 607,
      '综合工具（多模态）': 279,
      AI电商: 190,
      AI图片: 119,
    };

    for (const [category, count] of Object.entries(expectedCounts)) {
      expect(catalog.filter((agent) => agent.category === category)).toHaveLength(count);
    }

    expect(
      Object.values(expectedCounts).reduce((total, count) => total + count, 0),
    ).toBe(6336);
    expect(catalog.filter((agent) => !(agent.category in expectedCounts))).toHaveLength(22);
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
