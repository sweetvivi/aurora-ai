export interface VideoSourceImage {
  buffer: Buffer;
  mimeType: string;
  originalName: string;
}

export interface GenerateVideoInput {
  lastFrameImage?: VideoSourceImage;
  model?: string;
  parameters?: Record<string, unknown>;
  providerBaseUrl?: string;
  providerKeyRef?: string;
  prompt: string;
  sourceImage?: VideoSourceImage;
}

export interface GeneratedVideo {
  buffer: Buffer;
  extension: string;
  mimeType: string;
}

export interface VideoGenerationSnapshot {
  errorCode?: string;
  errorMessage?: string;
  progress: number;
  requestId: string;
  result?: GeneratedVideo;
  status: 'PROCESSING' | 'SUCCEEDED' | 'FAILED';
}

export interface VideoProvider {
  readonly supportsLastFrame?: boolean;
  createGeneration(input: GenerateVideoInput): Promise<VideoGenerationSnapshot>;
  pollGeneration(
    requestId: string,
    options?: {
      providerBaseUrl?: string;
      providerKeyRef?: string;
    },
  ): Promise<VideoGenerationSnapshot>;
}

export const VIDEO_PROVIDER = Symbol('VIDEO_PROVIDER');
