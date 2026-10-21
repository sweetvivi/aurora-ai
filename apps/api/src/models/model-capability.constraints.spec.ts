import { describe, expect, it } from 'vitest';
import {
  findImageModelConstraintViolation,
  findVideoModelConstraintViolation,
} from './model-capability.constraints';
import type { ModelCapabilityProfile } from './model-registry.service';

const imageProfile: ModelCapabilityProfile = {
  image: {
    maxReferenceImages: 3,
    sizePresets: ['1K', '2K'],
    supportsSequentialGeneration: false,
  },
};

const videoProfile: ModelCapabilityProfile = {
  video: {
    maxDuration: 12,
    resolutions: ['720P', '1080P'],
    supportsAudio: false,
    supportsLastFrame: false,
    supportsVideoInput: false,
  },
};

describe('model capability constraints', () => {
  it('limits image input images across the source and reference files', () => {
    expect(
      findImageModelConstraintViolation({
        profile: imageProfile,
        referenceFileIds: ['reference-1', 'reference-2'],
        sourceFileId: 'source-1',
      }),
    ).toBeNull();

    expect(
      findImageModelConstraintViolation({
        profile: imageProfile,
        referenceFileIds: ['reference-1', 'reference-2', 'reference-3'],
        sourceFileId: 'source-1',
      }),
    ).toMatchObject({
      code: 'IMAGE_REFERENCE_LIMIT_EXCEEDED',
    });
  });

  it('rejects unsupported image sizes and optional generation capabilities', () => {
    expect(
      findImageModelConstraintViolation({
        parameters: { size: '4K' },
        profile: imageProfile,
        referenceFileIds: [],
      }),
    ).toMatchObject({
      code: 'IMAGE_SIZE_UNSUPPORTED',
    });
    expect(
      findImageModelConstraintViolation({
        parameters: { sequential_image_generation: 'auto' },
        profile: imageProfile,
        referenceFileIds: [],
      }),
    ).toMatchObject({
      code: 'IMAGE_SEQUENTIAL_GENERATION_UNSUPPORTED',
    });
  });

  it('leaves models without a known profile backward compatible', () => {
    expect(
      findImageModelConstraintViolation({
        parameters: { size: '8K' },
        referenceFileIds: Array.from({ length: 20 }, (_, index) => `reference-${index}`),
      }),
    ).toBeNull();
    expect(
      findVideoModelConstraintViolation({
        hasLastFrame: true,
        parameters: { duration: 60, resolution: '8K' },
      }),
    ).toBeNull();
  });

  it('validates video duration, resolution, last frame, audio, and video input', () => {
    expect(
      findVideoModelConstraintViolation({
        hasLastFrame: false,
        parameters: { duration: 13, resolution: '1080P' },
        profile: videoProfile,
      }),
    ).toMatchObject({
      code: 'VIDEO_DURATION_UNSUPPORTED',
    });
    expect(
      findVideoModelConstraintViolation({
        hasLastFrame: false,
        parameters: { duration: 12, resolution: '4K' },
        profile: videoProfile,
      }),
    ).toMatchObject({
      code: 'VIDEO_RESOLUTION_UNSUPPORTED',
    });
    expect(
      findVideoModelConstraintViolation({
        hasLastFrame: true,
        profile: videoProfile,
      }),
    ).toMatchObject({
      code: 'VIDEO_LAST_FRAME_UNSUPPORTED',
    });
    expect(
      findVideoModelConstraintViolation({
        hasLastFrame: false,
        parameters: { audio: true },
        profile: videoProfile,
      }),
    ).toMatchObject({
      code: 'VIDEO_AUDIO_UNSUPPORTED',
    });
    expect(
      findVideoModelConstraintViolation({
        hasLastFrame: false,
        parameters: { videoFileId: 'video-1' },
        profile: videoProfile,
      }),
    ).toMatchObject({
      code: 'VIDEO_INPUT_UNSUPPORTED',
    });
    expect(
      findVideoModelConstraintViolation({
        hasLastFrame: false,
        hasReferenceVideo: true,
        profile: videoProfile,
      }),
    ).toMatchObject({
      code: 'VIDEO_INPUT_UNSUPPORTED',
    });
  });

  it('rejects image-to-video on models without first-frame input support', () => {
    expect(
      findVideoModelConstraintViolation({
        hasLastFrame: false,
        profile: { video: { ...videoProfile.video!, supportsImageInput: false } },
        sourceFileId: 'image-1',
      }),
    ).toMatchObject({
      code: 'VIDEO_IMAGE_INPUT_UNSUPPORTED',
    });

    expect(
      findVideoModelConstraintViolation({
        hasLastFrame: false,
        profile: { video: { ...videoProfile.video!, supportsImageInput: true } },
        sourceFileId: 'image-1',
      }),
    ).toBeNull();
  });

  it('rejects faithful editing on models that can only redraw from a reference', () => {
    const redrawOnly: ModelCapabilityProfile = {
      image: {
        maxReferenceImages: 3,
        sizePresets: ['1K'],
        supportsImageEdit: false,
      },
    };

    expect(
      findImageModelConstraintViolation({
        parameters: { mode: '局部编辑' },
        profile: redrawOnly,
        referenceFileIds: [],
        sourceFileId: 'source-1',
      }),
    ).toMatchObject({
      code: 'IMAGE_EDIT_UNSUPPORTED',
    });

    // 参考图重绘 / 画布里的「基于素材生成」不做保真要求，允许通过。
    expect(
      findImageModelConstraintViolation({
        parameters: { mode: '参考图重绘' },
        profile: redrawOnly,
        referenceFileIds: [],
        sourceFileId: 'source-1',
      }),
    ).toBeNull();
    expect(
      findImageModelConstraintViolation({
        parameters: { mode: 'canvas' },
        profile: redrawOnly,
        referenceFileIds: [],
        sourceFileId: 'source-1',
      }),
    ).toBeNull();
  });
});
