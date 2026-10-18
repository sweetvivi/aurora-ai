import type { ImageCapabilityProfile } from '@/app/api';

export const DEFAULT_IMAGE_SIZE_PRESETS = ['1K', '2K', '4K'];

export function getImageSizePresets(
  profile?: Pick<ImageCapabilityProfile, 'sizePresets'>,
): string[] {
  const presets = profile?.sizePresets
    ?.map((preset) => preset.trim().toUpperCase())
    .filter(Boolean);

  return presets?.length ? Array.from(new Set(presets)) : [...DEFAULT_IMAGE_SIZE_PRESETS];
}

export function clampImageSizePreset(size: string, presets: readonly string[]): string {
  const normalizedSize = size.trim().toUpperCase();

  return presets.includes(normalizedSize) ? normalizedSize : (presets[0] ?? '1K');
}
