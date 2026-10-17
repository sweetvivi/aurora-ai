import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LLM_PROVIDER } from './llm-provider';
import { IMAGE_PROVIDER } from './image-provider';
import { MockImageProvider } from './mock-image/mock-image.provider';
import { OpenAiImageProvider } from './openai-image/openai-image.provider';
import { OpenAiCompatibleProvider } from './openai-compatible/openai-compatible.provider';

@Module({
  providers: [
    OpenAiCompatibleProvider,
    OpenAiImageProvider,
    MockImageProvider,
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
  ],
  exports: [
    LLM_PROVIDER,
    OpenAiCompatibleProvider,
    IMAGE_PROVIDER,
    MockImageProvider,
    OpenAiImageProvider,
  ],
})
export class ProvidersModule {}
