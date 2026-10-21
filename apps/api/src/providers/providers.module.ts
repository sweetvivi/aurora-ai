import { Module } from '@nestjs/common';
import { LLM_PROVIDER } from './llm-provider';
import { IMAGE_PROVIDER } from './image-provider';
import { ImageProviderRouter } from './image-provider-router';
import { MockImageProvider } from './mock-image/mock-image.provider';
import { OpenAiImageProvider } from './openai-image/openai-image.provider';
import { OpenAiCompatibleProvider } from './openai-compatible/openai-compatible.provider';
import { SeedanceVideoProvider } from './seedance-video/seedance-video.provider';
import { SeedreamImageProvider } from './seedream-image/seedream-image.provider';
import { VIDEO_PROVIDER } from './video-provider';
import { VideoProviderRouter } from './video-provider-router';
import { MockVideoProvider } from './mock-video/mock-video.provider';
import { XaiImageProvider } from './xai-image/xai-image.provider';
import { XaiVideoProvider } from './xai-video/xai-video.provider';

@Module({
  providers: [
    OpenAiCompatibleProvider,
    OpenAiImageProvider,
    MockImageProvider,
    MockVideoProvider,
    SeedanceVideoProvider,
    SeedreamImageProvider,
    XaiImageProvider,
    XaiVideoProvider,
    ImageProviderRouter,
    VideoProviderRouter,
    {
      provide: LLM_PROVIDER,
      useExisting: OpenAiCompatibleProvider,
    },
    {
      provide: IMAGE_PROVIDER,
      useExisting: ImageProviderRouter,
    },
    {
      provide: VIDEO_PROVIDER,
      useExisting: VideoProviderRouter,
    },
  ],
  exports: [
    LLM_PROVIDER,
    OpenAiCompatibleProvider,
    ImageProviderRouter,
    IMAGE_PROVIDER,
    MockImageProvider,
    OpenAiImageProvider,
    SeedreamImageProvider,
    VideoProviderRouter,
    VIDEO_PROVIDER,
    MockVideoProvider,
    SeedanceVideoProvider,
    XaiImageProvider,
    XaiVideoProvider,
  ],
})
export class ProvidersModule {}
