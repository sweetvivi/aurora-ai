import { describe, expect, it } from 'vitest';
import { DRAW_EFFECT_CATEGORIES, DRAW_EFFECT_TEMPLATES } from './draw-templates';

describe('draw effect templates', () => {
  it('keeps the reference category order and template count', () => {
    expect(DRAW_EFFECT_CATEGORIES).toEqual([
      '全部',
      '人像美化',
      '场景优化',
      '创意设计',
      '风格迁移',
      '图片修复',
      'AI 绘画',
    ]);
    expect(DRAW_EFFECT_TEMPLATES).toHaveLength(17);
  });

  it('uses unique ids and complete card content', () => {
    const ids = DRAW_EFFECT_TEMPLATES.map((template) => template.id);
    const labels = DRAW_EFFECT_TEMPLATES.map((template) => template.label);

    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(labels).size).toBe(labels.length);

    for (const template of DRAW_EFFECT_TEMPLATES) {
      expect(template.description.length).toBeGreaterThan(12);
      expect(template.prompt.length).toBeGreaterThan(20);
      expect(template.tags).toHaveLength(2);
      expect(template.steps).toHaveLength(2);
      expect(template.image).toMatch(/^\/showcase\/.+\.png$/);
      expect(DRAW_EFFECT_CATEGORIES).toContain(template.category);
    }
  });

  it('covers every non-all category', () => {
    for (const category of DRAW_EFFECT_CATEGORIES.slice(1)) {
      expect(
        DRAW_EFFECT_TEMPLATES.some((template) => template.category === category),
      ).toBe(true);
    }
  });
});
