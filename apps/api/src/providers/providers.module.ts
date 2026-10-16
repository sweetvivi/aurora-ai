import { Module } from '@nestjs/common';
import { LLM_PROVIDER } from './llm-provider';
import { IMAGE_PROVIDER } from './image-provider';
import { MockImageProvider } from './mock-image/mock-image.provider';
import { OpenAiCompatibleProvider } from './openai-compatible/openai-compatible.provider';

@Module({
  providers: [
    OpenAiCompatibleProvider,
    MockImageProvider,
    {
      provide: LLM_PROVIDER,
      useExisting: OpenAiCompatibleProvider,
    },
    {
      provide: IMAGE_PROVIDER,
      useExisting: MockImageProvider,
    },
  ],
  exports: [LLM_PROVIDER, OpenAiCompatibleProvider, IMAGE_PROVIDER, MockImageProvider],
})
export class ProvidersModule {}
