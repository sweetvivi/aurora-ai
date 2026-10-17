import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LLM_PROVIDER } from './llm-provider';
import { IMAGE_PROVIDER } from './image-provider';
import { MockImageProvider } from './mock-image/mock-image.provider';
import { OpenAiImageProvider } from './openai-image/openai-image.provider';
import { OpenAiCompatibleProvider } from './openai-compatible/openai-compatible.provider';
import { VIDEO_PROVIDER } from './video-provider';
import { MockVideoProvider } from './mock-video/mock-video.provider';
import { XaiVideoProvider } from './xai-video/xai-video.provider';

@Module({
  providers: [
    OpenAiCompatibleProvider,
    OpenAiImageProvider,
    MockImageProvider,
    MockVideoProvider,
    XaiVideoProvider,
    {
      provide: LLM_PROVIDER,
      useExisting: OpenAiCompatibleProvider,
    },
    {
      provide: IMAGE_PROVIDER,
      inject: [ConfigService, MockImageProvider, OpenAiImageProvider],
      useFactory: (
        configService: ConfigService,
        mockImageProvider: MockImageProvider,
        openAiImageProvider: OpenAiImageProvider,
      ) => {
        const mode = configService.get<string>('IMAGE_PROVIDER', 'auto');

        if (mode === 'mock') {
          return mockImageProvider;
        }

        if (mode === 'openai') {
          return openAiImageProvider;
        }

        return configService.get<string>('IMAGE_API_KEY') ? openAiImageProvider : mockImageProvider;
      },
    },
    {
      provide: VIDEO_PROVIDER,
      inject: [ConfigService, MockVideoProvider, XaiVideoProvider],
      useFactory: (
        configService: ConfigService,
        mockVideoProvider: MockVideoProvider,
        xaiVideoProvider: XaiVideoProvider,
      ) => {
        const mode = configService.get<string>('VIDEO_PROVIDER', 'auto');

        if (mode === 'mock') {
          return mockVideoProvider;
        }

        if (mode === 'xai') {
          return xaiVideoProvider;
        }

        return configService.get<string>('VIDEO_API_KEY') ? xaiVideoProvider : mockVideoProvider;
      },
    },
  ],
  exports: [
    LLM_PROVIDER,
    OpenAiCompatibleProvider,
    IMAGE_PROVIDER,
    MockImageProvider,
    OpenAiImageProvider,
    VIDEO_PROVIDER,
    MockVideoProvider,
    XaiVideoProvider,
  ],
})
export class ProvidersModule {}
