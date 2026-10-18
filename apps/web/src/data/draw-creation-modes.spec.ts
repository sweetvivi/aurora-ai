import { describe, expect, it } from 'vitest';
import {
  DRAW_CREATION_MODES,
  getDrawCreationModeConfig,
  isDrawCreationMode,
  validateDrawCreationInput,
} from './draw-creation-modes';

describe('draw creation modes', () => {
  it('keeps the reference-site order', () => {
    expect(DRAW_CREATION_MODES).toEqual(['文生图', '参考图重绘', '局部编辑', '商品图处理']);
  });

  it('recognizes supported modes and rejects unknown values', () => {
    expect(isDrawCreationMode('局部编辑')).toBe(true);
    expect(isDrawCreationMode('视频生成')).toBe(false);
    expect(isDrawCreationMode(null)).toBe(false);
  });

  it('allows text-to-image without a reference and requires a prompt', () => {
    expect(
      validateDrawCreationInput({
        mode: '文生图',
        prompt: '春日湖边',
        referenceCount: 0,
      }),
    ).toBe('');
    expect(getDrawCreationModeConfig('文生图').referenceLabel).toBe('参考图（可选）');
  });

  it('requires a reference for redraw and commerce modes', () => {
    expect(
      validateDrawCreationInput({
        mode: '参考图重绘',
        prompt: '改成夜景',
        referenceCount: 0,
      }),
    ).toContain('至少上传 1 张图片');
    expect(
      validateDrawCreationInput({
        mode: '商品图处理',
        prompt: '替换背景',
        referenceCount: 0,
      }),
    ).toContain('至少上传 1 张商品图');
  });

  it('prioritizes a missing local-edit source over prompt validation', () => {
    expect(
      validateDrawCreationInput({
        mode: '局部编辑',
        prompt: '',
        referenceCount: 0,
      }),
    ).toContain('需要 1 张原图');
  });
});
