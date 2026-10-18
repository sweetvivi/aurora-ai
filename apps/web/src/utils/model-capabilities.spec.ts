import { describe, expect, it } from 'vitest';
import {
  DEFAULT_IMAGE_SIZE_PRESETS,
  clampImageSizePreset,
  getImageSizePresets,
} from './model-capabilities';

describe('model capability helpers', () => {
  it('falls back to the default image presets when a profile is unavailable', () => {
    expect(getImageSizePresets()).toEqual(DEFAULT_IMAGE_SIZE_PRESETS);
  });

  it('normalizes, removes duplicates and preserves profile order', () => {
    expect(getImageSizePresets({ sizePresets: ['2k', ' 1K ', '2K', ''] })).toEqual(['2K', '1K']);
  });

  it('keeps a supported preset selected', () => {
    expect(clampImageSizePreset('4k', ['2K', '4K'])).toBe('4K');
  });

  it('selects the first supported preset when the current preset is unavailable', () => {
    expect(clampImageSizePreset('1K', ['2K', '4K'])).toBe('2K');
    expect(clampImageSizePreset('4K', [])).toBe('1K');
  });
});
