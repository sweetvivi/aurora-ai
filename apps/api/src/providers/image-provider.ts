export interface GenerateImageInput {
  parameters?: Record<string, unknown>;
  prompt: string;
  sourceImage?: {
    buffer: Buffer;
    mimeType: string;
    originalName: string;
  };
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
