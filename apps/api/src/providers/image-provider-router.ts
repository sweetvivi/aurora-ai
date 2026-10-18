import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { GenerateImageInput, GeneratedImage, ImageProvider } from './image-provider';
import { MockImageProvider } from './mock-image/mock-image.provider';
import { OpenAiImageProvider } from './openai-image/openai-image.provider';
import { resolveImageProviderProtocol } from './provider-protocol';
import { SeedreamImageProvider } from './seedream-image/seedream-image.provider';

@Injectable()
export class ImageProviderRouter implements ImageProvider {
  constructor(
    private readonly configService: ConfigService,
    private readonly mockImageProvider: MockImageProvider,
    private readonly openAiImageProvider: OpenAiImageProvider,
    private readonly seedreamImageProvider: SeedreamImageProvider,
  ) {}

  generateImage(input: GenerateImageInput): Promise<GeneratedImage> {
    return this.selectProvider(input).generateImage(input);
  }

  private selectProvider(input: GenerateImageInput): ImageProvider {
    const mode = this.configService.get<string>('IMAGE_PROVIDER', 'auto');

    if (mode === 'mock') {
      return this.mockImageProvider;
    }

    if (mode === 'openai') {
      return this.openAiImageProvider;
    }

    if (
      resolveImageProviderProtocol(input) === 'seedream' &&
      this.hasConfiguredKey(input.providerKeyRef, 'IMAGE_SEEDREAM_API_KEY', 'IMAGE_API_KEY')
    ) {
      return this.seedreamImageProvider;
    }

    return this.hasConfiguredKey(input.providerKeyRef, 'IMAGE_API_KEY')
      ? this.openAiImageProvider
      : this.mockImageProvider;
  }

  private hasConfiguredKey(providerKeyRef: string | undefined, ...fallbackKeys: string[]): boolean {
    const keys = providerKeyRef?.trim() ? [providerKeyRef, ...fallbackKeys] : fallbackKeys;

    return keys.some((key) => Boolean(this.configService.get<string>(key)?.trim()));
  }
}
