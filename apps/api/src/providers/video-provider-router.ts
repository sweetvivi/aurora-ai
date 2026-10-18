import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MockVideoProvider } from './mock-video/mock-video.provider';
import { resolveVideoProviderProtocol } from './provider-protocol';
import { SeedanceVideoProvider } from './seedance-video/seedance-video.provider';
import type { GenerateVideoInput, VideoGenerationSnapshot, VideoProvider } from './video-provider';
import { XaiVideoProvider } from './xai-video/xai-video.provider';

interface VideoProviderRouteInput {
  model?: string;
  providerBaseUrl?: string;
  providerCode?: string;
  providerKeyRef?: string;
}

@Injectable()
export class VideoProviderRouter implements VideoProvider {
  constructor(
    private readonly configService: ConfigService,
    private readonly mockVideoProvider: MockVideoProvider,
    private readonly xaiVideoProvider: XaiVideoProvider,
    private readonly seedanceVideoProvider: SeedanceVideoProvider,
  ) {}

  supportsLastFrameFor(input: VideoProviderRouteInput): boolean {
    const provider = this.selectProvider(input);

    return provider.supportsLastFrameFor?.(input) ?? provider.supportsLastFrame !== false;
  }

  createGeneration(input: GenerateVideoInput): Promise<VideoGenerationSnapshot> {
    return this.selectProvider(input).createGeneration(input);
  }

  pollGeneration(
    requestId: string,
    options?: VideoProviderRouteInput,
  ): Promise<VideoGenerationSnapshot> {
    return this.selectProvider(options ?? {}).pollGeneration(requestId, options);
  }

  private selectProvider(input: VideoProviderRouteInput): VideoProvider {
    const mode = this.configService.get<string>('VIDEO_PROVIDER', 'auto');

    if (mode === 'mock') {
      return this.mockVideoProvider;
    }

    if (mode === 'xai') {
      return this.xaiVideoProvider;
    }

    if (
      resolveVideoProviderProtocol(input) === 'seedance' &&
      this.hasConfiguredKey(input.providerKeyRef, 'VIDEO_SEEDANCE_API_KEY', 'VIDEO_API_KEY')
    ) {
      return this.seedanceVideoProvider;
    }

    return this.hasConfiguredKey(input.providerKeyRef, 'VIDEO_API_KEY')
      ? this.xaiVideoProvider
      : this.mockVideoProvider;
  }

  private hasConfiguredKey(providerKeyRef: string | undefined, ...fallbackKeys: string[]): boolean {
    const keys = providerKeyRef?.trim() ? [providerKeyRef, ...fallbackKeys] : fallbackKeys;

    return keys.some((key) => Boolean(this.configService.get<string>(key)?.trim()));
  }
}
