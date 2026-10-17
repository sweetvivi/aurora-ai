import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { GeneratedImage, GenerateImageInput, ImageProvider } from '../image-provider';

interface OpenAiImageResponse {
  data?: Array<{
    b64_json?: string;
    url?: string;
  }>;
}

interface ImagePayload {
  body: BodyInit;
  headers: Record<string, string>;
}

const MAX_IMAGE_BYTES = 30 * 1024 * 1024;

@Injectable()
export class OpenAiImageProvider implements ImageProvider {
  constructor(private readonly configService: ConfigService) {}

  async generateImage(input: GenerateImageInput): Promise<GeneratedImage> {
    const apiKeys = this.apiKeys(input.providerKeyRef);

    if (apiKeys.length === 0) {
      throw this.createError('IMAGE_NOT_CONFIGURED', '图片生成服务尚未配置');
    }

    let lastError: unknown;

    for (const [index, apiKey] of apiKeys.entries()) {
      try {
        return await this.requestImage(input, apiKey);
      } catch (error) {
        lastError = error;

        if (index === apiKeys.length - 1 || !this.canRetryWithFallback(error)) {
          throw error;
        }
      }
    }

    throw lastError ?? this.createError('IMAGE_GENERATION_FAILED', '图片生成失败，请重试');
  }

  private async requestImage(input: GenerateImageInput, apiKey: string): Promise<GeneratedImage> {
    const timeoutController = new AbortController();
    const timeoutMs = this.configService.get<number>('IMAGE_REQUEST_TIMEOUT_MS', 180_000);
    const timeout = setTimeout(() => timeoutController.abort(), timeoutMs);

    try {
      const baseUrl = (
        input.providerBaseUrl?.trim() || this.configService.getOrThrow<string>('IMAGE_BASE_URL')
      ).replace(/\/+$/, '');
      const payload = this.createPayload(input);
      const actor = this.configService.get<string>('IMAGE_ACTOR_AUTHORIZATION');
      const response = await fetch(
        `${baseUrl}${input.sourceImages?.length ? '/images/edits' : '/images/generations'}`,
        {
          body: payload.body,
          headers: {
            ...payload.headers,
            authorization: `Bearer ${apiKey}`,
            ...(actor ? { 'x-openai-actor-authorization': actor } : {}),
          },
          method: 'POST',
          signal: timeoutController.signal,
        },
      );

      if (!response.ok) {
        throw this.createError(
          this.providerErrorCode(response.status),
          `图片生成服务返回 HTTP ${response.status}`,
        );
      }

      const result = await this.parseResponse(response, timeoutController.signal);
      return await this.resolveImage(result, timeoutController.signal);
    } catch (error) {
      if (timeoutController.signal.aborted) {
        throw this.createError('IMAGE_TIMEOUT', '图片生成请求超时，请重试');
      }

      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  private createPayload(input: GenerateImageInput): ImagePayload {
    const model =
      input.model ?? this.configService.get<string>('IMAGE_DEFAULT_MODEL', 'gpt-image-2.5');
    const size = resolveImageSize(input.parameters);
    const quality = resolveImageQuality(input.parameters);

    if (input.sourceImages?.length) {
      const form = new FormData();

      form.append('model', model);
      form.append('prompt', input.prompt);
      form.append('n', '1');
      form.append('size', size);
      form.append('quality', quality);
      form.append('output_format', 'png');
      const imageField = input.sourceImages.length === 1 ? 'image' : 'image[]';

      for (const sourceImage of input.sourceImages) {
        form.append(
          imageField,
          new Blob([new Uint8Array(sourceImage.buffer)], {
            type: sourceImage.mimeType,
          }),
          sourceImage.originalName,
        );
      }

      return {
        body: form,
        headers: {},
      };
    }

    return {
      body: JSON.stringify({
        model,
        n: 1,
        output_format: 'png',
        prompt: input.prompt,
        quality,
        size,
      }),
      headers: {
        'content-type': 'application/json',
      },
    };
  }

  private async parseResponse(
    response: Response,
    signal: AbortSignal,
  ): Promise<{ b64Json?: string; url?: string }> {
    let payload: OpenAiImageResponse;

    try {
      payload = (await response.json()) as OpenAiImageResponse;
    } catch {
      throw this.createError('IMAGE_INVALID_RESPONSE', '图片生成服务返回了无效响应');
    }

    const image = payload.data?.[0];

    if (!image?.b64_json && !image?.url) {
      throw this.createError('IMAGE_INVALID_RESPONSE', '图片生成服务未返回图片');
    }

    if (signal.aborted) {
      throw this.createError('IMAGE_TIMEOUT', '图片生成请求超时，请重试');
    }

    return {
      b64Json: image.b64_json,
      url: image.url,
    };
  }

  private async resolveImage(
    image: { b64Json?: string; url?: string },
    signal: AbortSignal,
  ): Promise<GeneratedImage> {
    if (image.b64Json) {
      return normalizeImage(Buffer.from(image.b64Json, 'base64'));
    }

    if (!image.url) {
      throw this.createError('IMAGE_INVALID_RESPONSE', '图片生成服务未返回图片');
    }

    const response = await fetch(image.url, { signal });

    if (!response.ok) {
      throw this.createError(
        'IMAGE_RESULT_DOWNLOAD_FAILED',
        `图片结果下载失败 HTTP ${response.status}`,
      );
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const contentType = response.headers.get('content-type')?.split(';')[0]?.trim();

    return normalizeImage(buffer, contentType);
  }

  private apiKeys(providerKeyRef?: string): string[] {
    const configuredKeyRef = providerKeyRef?.trim();

    if (configuredKeyRef) {
      return [this.configService.get<string>(configuredKeyRef)].filter((key): key is string =>
        Boolean(key?.trim()),
      );
    }

    return [
      this.configService.get<string>('IMAGE_API_KEY'),
      this.configService.get<string>('IMAGE_FALLBACK_API_KEY'),
    ].filter((key): key is string => Boolean(key?.trim()));
  }

  private canRetryWithFallback(error: unknown): boolean {
    const response =
      typeof error === 'object' && error !== null && 'getResponse' in error
        ? (error as { getResponse: () => unknown }).getResponse()
        : undefined;
    const code =
      typeof response === 'object' && response !== null
        ? (response as Record<string, unknown>).code
        : undefined;

    return code === 'IMAGE_AUTH_ERROR';
  }

  private providerErrorCode(status: number): string {
    if (status === 401 || status === 403) {
      return 'IMAGE_AUTH_ERROR';
    }

    if (status === 429) {
      return 'IMAGE_RATE_LIMITED';
    }

    if (status >= 500) {
      return 'IMAGE_PROVIDER_UNAVAILABLE';
    }

    return 'IMAGE_REQUEST_ERROR';
  }

  private createError(code: string, message: string): ServiceUnavailableException {
    return new ServiceUnavailableException({ code, message });
  }
}

function resolveImageSize(parameters: Record<string, unknown> | undefined): string {
  const explicitSize = typeof parameters?.size === 'string' ? parameters.size.toLowerCase() : '';
  const ratio = typeof parameters?.ratio === 'string' ? parameters.ratio : '';

  if (/^\d{3,4}x\d{3,4}$/.test(explicitSize)) {
    return explicitSize;
  }

  if (['16:9', '4:3', '3:2', 'landscape'].includes(ratio)) {
    return '1536x1024';
  }

  if (['9:16', '3:4', '2:3', 'portrait'].includes(ratio)) {
    return '1024x1536';
  }

  return '1024x1024';
}

function resolveImageQuality(parameters: Record<string, unknown> | undefined): string {
  const quality = typeof parameters?.quality === 'string' ? parameters.quality.toLowerCase() : '';
  const size = typeof parameters?.size === 'string' ? parameters.size.toLowerCase() : '';

  if (['high', 'medium', 'low'].includes(quality)) {
    return quality;
  }

  if (size === '4k') {
    return 'high';
  }

  return 'medium';
}

function normalizeImage(buffer: Buffer, declaredMimeType?: string): GeneratedImage {
  if (buffer.length === 0) {
    throw new ServiceUnavailableException({
      code: 'IMAGE_PROVIDER_INVALID_RESULT',
      message: '图片生成服务返回了空结果',
    });
  }

  if (buffer.length > MAX_IMAGE_BYTES) {
    throw new ServiceUnavailableException({
      code: 'IMAGE_RESULT_TOO_LARGE',
      message: '图片结果超过允许的大小',
    });
  }

  const detected = detectImageType(buffer);
  const mimeType =
    detected?.mimeType ?? (declaredMimeType?.startsWith('image/') ? declaredMimeType : undefined);
  const extension = detected?.extension ?? extensionFromMimeType(mimeType);

  if (!mimeType || !extension) {
    throw new ServiceUnavailableException({
      code: 'IMAGE_PROVIDER_INVALID_RESULT',
      message: '图片生成服务返回了不支持的文件格式',
    });
  }

  return {
    buffer,
    extension,
    mimeType,
  };
}

function detectImageType(buffer: Buffer): { extension: string; mimeType: string } | undefined {
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return { extension: 'png', mimeType: 'image/png' };
  }

  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { extension: 'jpg', mimeType: 'image/jpeg' };
  }

  if (
    buffer.length >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return { extension: 'webp', mimeType: 'image/webp' };
  }

  if (buffer.length >= 6 && buffer.toString('ascii', 0, 6).startsWith('GIF8')) {
    return { extension: 'gif', mimeType: 'image/gif' };
  }

  return undefined;
}

function extensionFromMimeType(mimeType: string | undefined): string | undefined {
  const extensions: Record<string, string> = {
    'image/gif': 'gif',
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
  };

  return mimeType ? extensions[mimeType] : undefined;
}
