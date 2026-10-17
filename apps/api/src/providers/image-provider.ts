export interface GenerateImageInput {
  model?: string;
  parameters?: Record<string, unknown>;
  providerBaseUrl?: string;
  providerKeyRef?: string;
  prompt: string;
  sourceImages?: Array<{
    buffer: Buffer;
    mimeType: string;
    originalName: string;
  }>;
}

export interface GeneratedImage {
  buffer: Buffer;
  extension: string;
  mimeType: string;
}

export interface ImageProvider {
  generateImage(input: GenerateImageInput): Promise<GeneratedImage>;
}

export const IMAGE_PROVIDER = Symbol('IMAGE_PROVIDER');
