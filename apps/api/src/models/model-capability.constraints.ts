import type { ModelCapabilityProfile } from './model-registry.service';

export interface ModelConstraintViolation {
  code: string;
  message: string;
}

/** 需要「保留原图、只改指定区域」的编辑类模式；只有支持保真编辑的模型能接。 */
const IMAGE_EDIT_MODES = new Set([
  '局部编辑',
  '商品图处理',
  'image-edit',
  'image-to-image',
  'retouch',
]);

export function findImageModelConstraintViolation(input: {
  parameters?: Record<string, unknown>;
  profile?: ModelCapabilityProfile;
  referenceFileIds: string[];
  sourceFileId?: string;
}): ModelConstraintViolation | null {
  const profile = input.profile?.image;

  if (!profile) {
    return null;
  }

  const inputImageCount = input.referenceFileIds.length + (input.sourceFileId ? 1 : 0);
  const mode = readString(input.parameters?.mode);

  if (
    profile.supportsImageEdit === false &&
    inputImageCount > 0 &&
    mode !== undefined &&
    IMAGE_EDIT_MODES.has(mode.toLowerCase())
  ) {
    return {
      code: 'IMAGE_EDIT_UNSUPPORTED',
      message: '当前模型只能用参考图重新绘制，不支持保留原图的编辑，请切换到支持编辑的模型',
    };
  }

  if (inputImageCount > profile.maxReferenceImages) {
    return {
      code: 'IMAGE_REFERENCE_LIMIT_EXCEEDED',
      message: `当前模型最多支持 ${profile.maxReferenceImages} 张输入图片`,
    };
  }

  const sizePreset = readUppercaseString(input.parameters, ['size', 'sizePreset', 'size_preset']);

  if (
    sizePreset &&
    /^\d+(?:\.\d+)?K$/i.test(sizePreset) &&
    !profile.sizePresets.includes(sizePreset)
  ) {
    return {
      code: 'IMAGE_SIZE_UNSUPPORTED',
      message: `当前模型不支持 ${sizePreset} 清晰度，可选：${profile.sizePresets.join('、')}`,
    };
  }

  if (
    isRequested(input.parameters?.sequentialGeneration) ||
    isRequested(input.parameters?.sequential_image_generation)
  ) {
    if (!profile.supportsSequentialGeneration) {
      return {
        code: 'IMAGE_SEQUENTIAL_GENERATION_UNSUPPORTED',
        message: '当前模型不支持组图生成',
      };
    }
  }

  if (
    isRequested(input.parameters?.layerDecomposition) ||
    isRequested(input.parameters?.layer_decomposition)
  ) {
    if (!profile.supportsLayerDecomposition) {
      return {
        code: 'IMAGE_LAYER_DECOMPOSITION_UNSUPPORTED',
        message: '当前模型不支持图层拆分',
      };
    }
  }

  return null;
}

export function findVideoModelConstraintViolation(input: {
  hasLastFrame: boolean;
  hasReferenceVideo?: boolean;
  parameters?: Record<string, unknown>;
  profile?: ModelCapabilityProfile;
  sourceFileId?: string;
}): ModelConstraintViolation | null {
  const profile = input.profile?.video;

  if (!profile) {
    return null;
  }

  const duration = readPositiveNumber(input.parameters?.duration);

  if (duration !== undefined && duration > profile.maxDuration) {
    return {
      code: 'VIDEO_DURATION_UNSUPPORTED',
      message: `当前模型最长支持 ${profile.maxDuration} 秒视频`,
    };
  }

  const resolution = readUppercaseString(input.parameters, ['resolution', 'size']);

  if (resolution && !profile.resolutions.includes(resolution)) {
    return {
      code: 'VIDEO_RESOLUTION_UNSUPPORTED',
      message: `当前模型不支持 ${resolution} 分辨率，可选：${profile.resolutions.join('、')}`,
    };
  }

  if (input.sourceFileId && profile.supportsImageInput === false) {
    return {
      code: 'VIDEO_IMAGE_INPUT_UNSUPPORTED',
      message: '当前视频模型不支持图生视频，请切换为文生视频或换用支持首帧输入的模型',
    };
  }

  if (input.hasLastFrame && profile.supportsLastFrame === false) {
    return {
      code: 'VIDEO_LAST_FRAME_UNSUPPORTED',
      message: '当前视频模型暂不支持首尾帧模式，请切换为文生视频或图生视频',
    };
  }

  if (
    (isRequested(input.parameters?.audio) ||
      isRequested(input.parameters?.generateAudio) ||
      isRequested(input.parameters?.generate_audio)) &&
    profile.supportsAudio === false
  ) {
    return {
      code: 'VIDEO_AUDIO_UNSUPPORTED',
      message: '当前模型不支持音频生成',
    };
  }

  if (
    (input.hasReferenceVideo ||
      input.parameters?.videoFileId !== undefined ||
      input.parameters?.video_file_id !== undefined) &&
    profile.supportsVideoInput === false
  ) {
    return {
      code: 'VIDEO_INPUT_UNSUPPORTED',
      message: '当前模型不支持视频输入',
    };
  }

  return null;
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function readUppercaseString(
  parameters: Record<string, unknown> | undefined,
  keys: string[],
): string | undefined {
  for (const key of keys) {
    const value = parameters?.[key];

    if (typeof value === 'string' && value.trim()) {
      return value.trim().toUpperCase();
    }
  }

  return undefined;
}

function readPositiveNumber(value: unknown): number | undefined {
  const number = Number(value);

  return Number.isFinite(number) && number > 0 ? number : undefined;
}

function isRequested(value: unknown): boolean {
  if (value === true) {
    return true;
  }

  if (typeof value === 'number') {
    return value !== 0;
  }

  if (typeof value !== 'string') {
    return false;
  }

  return !['0', 'disabled', 'false', 'none', 'off'].includes(value.trim().toLowerCase());
}
