import { ConfigService } from '@nestjs/config';
import { describe, expect, it, vi } from 'vitest';
import type { ImageProvider } from './image-provider';
import { ImageProviderRouter } from './image-provider-router';
import type { MockImageProvider } from './mock-image/mock-image.provider';
import type { MockVideoProvider } from './mock-video/mock-video.provider';
import type { OpenAiImageProvider } from './openai-image/openai-image.provider';
import type { SeedanceVideoProvider } from './seedance-video/seedance-video.provider';
import type { SeedreamImageProvider } from './seedream-image/seedream-image.provider';
import type { VideoProvider } from './video-provider';
import { VideoProviderRouter } from './video-provider-router';
import type { XaiImageProvider } from './xai-image/xai-image.provider';
import type { XaiVideoProvider } from './xai-video/xai-video.provider';

describe('provider routers', () => {
  it('selects Seedream and Seedance when provider metadata and keys are present', async () => {
    const openAiImageProvider = createImageProvider('openai');
    const seedreamImageProvider = createImageProvider('seedream');
    const xaiVideoProvider = createVideoProvider('xai');
    const seedanceVideoProvider = createVideoProvider('seedance');
    const imageRouter = new ImageProviderRouter(
      new ConfigService({
        IMAGE_PROVIDER: 'auto',
        IMAGE_SEEDREAM_API_KEY: 'seedream-key',
        VIDEO_PROVIDER: 'auto',
        VIDEO_API_KEY: 'xai-key',
        VIDEO_SEEDANCE_API_KEY: 'seedance-key',
      }),
      createImageProvider('mock') as unknown as MockImageProvider,
      openAiImageProvider as unknown as OpenAiImageProvider,
      seedreamImageProvider as unknown as SeedreamImageProvider,
      createImageProvider('xai') as unknown as XaiImageProvider,
    );
    const videoRouter = new VideoProviderRouter(
      new ConfigService({
        IMAGE_PROVIDER: 'auto',
        IMAGE_SEEDREAM_API_KEY: 'seedream-key',
        VIDEO_PROVIDER: 'auto',
        VIDEO_API_KEY: 'xai-key',
        VIDEO_SEEDANCE_API_KEY: 'seedance-key',
      }),
      createVideoProvider('mock') as unknown as MockVideoProvider,
      xaiVideoProvider as unknown as XaiVideoProvider,
      seedanceVideoProvider as unknown as SeedanceVideoProvider,
    );

    await imageRouter.generateImage({
      model: 'doubao-seedream-4-0-250828',
      prompt: '测试路由',
      providerCode: 'volcengine',
    });
    await videoRouter.createGeneration({
      model: 'doubao-seedance-1-0-pro-250528',
      prompt: '测试路由',
      providerCode: 'volcengine',
    });

    expect(seedreamImageProvider.generateImage).toHaveBeenCalledOnce();
    expect(openAiImageProvider.generateImage).not.toHaveBeenCalled();
    expect(seedanceVideoProvider.createGeneration).toHaveBeenCalledOnce();
    expect(xaiVideoProvider.createGeneration).not.toHaveBeenCalled();
    expect(
      videoRouter.supportsLastFrameFor({
        model: 'doubao-seedance-1-0-pro-250528',
        providerCode: 'volcengine',
      }),
    ).toBe(true);
    expect(
      videoRouter.supportsLastFrameFor({
        model: 'grok-imagine-video',
        providerCode: 'xai',
      }),
    ).toBe(false);
  });

  it('keeps explicit modes and the no-key Mock fallback intact', async () => {
    const mockImageProvider = createImageProvider('mock');
    const mockVideoProvider = createVideoProvider('mock');
    const openAiImageProvider = createImageProvider('openai');
    const xaiVideoProvider = createVideoProvider('xai');
    const config = new ConfigService({
      IMAGE_PROVIDER: 'auto',
      VIDEO_PROVIDER: 'auto',
    });
    const imageRouter = new ImageProviderRouter(
      config,
      mockImageProvider as unknown as MockImageProvider,
      openAiImageProvider as unknown as OpenAiImageProvider,
      createImageProvider('seedream') as unknown as SeedreamImageProvider,
      createImageProvider('xai') as unknown as XaiImageProvider,
    );
    const videoRouter = new VideoProviderRouter(
      config,
      mockVideoProvider as unknown as MockVideoProvider,
      xaiVideoProvider as unknown as XaiVideoProvider,
      createVideoProvider('seedance') as unknown as SeedanceVideoProvider,
    );

    await imageRouter.generateImage({
      model: 'doubao-seedream-4-0-250828',
      prompt: '无 Key 回退',
      providerCode: 'volcengine',
    });
    await videoRouter.createGeneration({
      model: 'grok-imagine-video',
      prompt: '无 Key 回退',
      providerCode: 'xai',
    });

    expect(mockImageProvider.generateImage).toHaveBeenCalledOnce();
    expect(mockVideoProvider.createGeneration).toHaveBeenCalledOnce();

    const forcedImage = new ImageProviderRouter(
      new ConfigService({
        IMAGE_PROVIDER: 'openai',
        IMAGE_SEEDREAM_API_KEY: 'seedream-key',
      }),
      mockImageProvider as unknown as MockImageProvider,
      openAiImageProvider as unknown as OpenAiImageProvider,
      createImageProvider('seedream') as unknown as SeedreamImageProvider,
      createImageProvider('xai') as unknown as XaiImageProvider,
    );
    const forcedVideo = new VideoProviderRouter(
      new ConfigService({
        VIDEO_PROVIDER: 'xai',
        VIDEO_SEEDANCE_API_KEY: 'seedance-key',
      }),
      mockVideoProvider as unknown as MockVideoProvider,
      xaiVideoProvider as unknown as XaiVideoProvider,
      createVideoProvider('seedance') as unknown as SeedanceVideoProvider,
    );

    await forcedImage.generateImage({
      model: 'doubao-seedream-4-0-250828',
      prompt: '显式模式',
      providerCode: 'volcengine',
    });
    await forcedVideo.createGeneration({
      model: 'doubao-seedance-1-0-pro-250528',
      prompt: '显式模式',
      providerCode: 'volcengine',
    });

    expect(openAiImageProvider.generateImage).toHaveBeenCalledOnce();
    expect(xaiVideoProvider.createGeneration).toHaveBeenCalledOnce();
  });
});

function createImageProvider(label: string): ImageProvider & {
  generateImage: ReturnType<typeof vi.fn>;
} {
  return {
    generateImage: vi.fn().mockResolvedValue({
      buffer: Buffer.from(label),
      extension: 'png',
      mimeType: 'image/png',
    }),
  };
}

function createVideoProvider(label: string): VideoProvider & {
  createGeneration: ReturnType<typeof vi.fn>;
  pollGeneration: ReturnType<typeof vi.fn>;
} {
  return {
    createGeneration: vi.fn().mockResolvedValue({
      progress: 1,
      requestId: `${label}-request`,
      status: 'PROCESSING',
    }),
    pollGeneration: vi.fn().mockResolvedValue({
      progress: 100,
      requestId: `${label}-request`,
      status: 'SUCCEEDED',
    }),
    supportsLastFrame: label !== 'xai',
  };
}
