import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { GenerateImageInput, GeneratedImage, ImageProvider } from './image-provider';
import { MockImageProvider } from './mock-image/mock-image.provider';
import { OpenAiImageProvider } from './openai-image/openai-image.provider';
import { resolveImageProviderProtocol } from './provider-protocol';
import { SeedreamImageProvider } from './seedream-image/seedream-image.provider';
import { XaiImageProvider } from './xai-image/xai-image.provider';

@Injectable()
export class ImageProviderRouter implements ImageProvider {
  constructor(
    private readonly configService: ConfigService,
    private readonly mockImageProvider: MockImageProvider,
    private readonly openAiImageProvider: OpenAiImageProvider,
    private readonly seedreamImageProvider: SeedreamImageProvider,
    private readonly xaiImageProvider: XaiImageProvider,
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

    if (mode === 'xai') {
      return this.xaiImageProvider;
    }

    const protocol = resolveImageProviderProtocol(input);

    if (protocol === 'xai' && this.hasConfiguredKey(input.providerKeyRef, 'IMAGE_GROK_API_KEY')) {
      return this.xaiImageProvider;
    }

    if (
      protocol === 'seedream' &&
      this.hasConfiguredKey(input.providerKeyRef, 'IMAGE_SEEDREAM_API_KEY', 'IMAGE_API_KEY')
    ) {
      return this.seedreamImageProvider;
    }

    if (protocol === 'xai') {
      // 选中的是 Grok 生图但没有配置对应密钥：直接失败比静默回退到另一家模型更清楚，
      // 否则用户会以为自己在用 Grok，实际拿到的是 GPT Image 的结果。
      return this.xaiImageProvider;
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
