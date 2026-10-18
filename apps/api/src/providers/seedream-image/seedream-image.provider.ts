import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { GeneratedImage, GenerateImageInput, ImageProvider } from '../image-provider';
import { buildArkApiUrl } from '../provider-protocol';

const MAX_IMAGE_BYTES = 30 * 1024 * 1024;
const SUPPORTED_SIZE_PRESETS = new Set(['1K', '1.5K', '2K', '3K', '4K']);
const FORWARDED_PARAMETER_KEYS = new Set([
  'background',
  'guidance_scale',
  'layer_decomposition',
  'optimize_prompt',
  'optimize_prompt_options',
  'output_format',
  'seed',
  'sequential_image_generation',
  'sequential_image_generation_options',
  'tools',
  'watermark',
]);

interface SeedreamImageResponse {
  data?: unknown;
  error?: {
    code?: string;
    message?: string;
  };
}

interface SeedreamImageEntry {
  b64_json?: string;
  url?: string;
}

@Injectable()
export class SeedreamImageProvider implements ImageProvider {
  constructor(private readonly configService: ConfigService) {}

  async generateImage(input: GenerateImageInput): Promise<GeneratedImage> {
    const apiKey = this.resolveApiKey(input.providerKeyRef);

    if (!apiKey) {
      throw this.createError('IMAGE_NOT_CONFIGURED', '图片生成服务尚未配置');
    }

    const timeoutController = new AbortController();
    const timeoutMs = this.configService.get<number>('IMAGE_REQUEST_TIMEOUT_MS', 180_000);
    const timer = setTimeout(() => timeoutController.abort(), timeoutMs);

    timer.unref();

    try {
      const baseUrl =
        input.providerBaseUrl?.trim() || this.configService.getOrThrow<string>('IMAGE_BASE_URL');
      const response = await fetch(buildArkApiUrl(baseUrl, '/images/generations'), {
        body: JSON.stringify(this.createPayload(input)),
        headers: {
          accept: 'application/json',
          authorization: `Bearer ${apiKey}`,
          'content-type': 'application/json',
        },
        method: 'POST',
        signal: timeoutController.signal,
      });

      if (!response.ok) {
        throw this.createError(
          this.providerErrorCode(response.status),
          `图片生成服务返回 HTTP ${response.status}`,
        );
      }

      const result = await this.parseResponse(response);

      return await this.resolveImage(result, timeoutController.signal);
    } catch (error) {
      if (timeoutController.signal.aborted) {
        throw this.createError('IMAGE_TIMEOUT', '图片生成请求超时，请重试');
      }

      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  private createPayload(input: GenerateImageInput): Record<string, unknown> {
    const payload: Record<string, unknown> = {
      model:
        input.model ??
        this.configService.get<string>('IMAGE_SEEDREAM_DEFAULT_MODEL') ??
        this.configService.get<string>('IMAGE_DEFAULT_MODEL', 'seedream-4-0-250828'),
      prompt: input.prompt,
      response_format: 'url',
    };
    const size = resolveSeedreamSize(input.parameters);

    if (size) {
      payload.size = size;
    }

    for (const [key, value] of Object.entries(input.parameters ?? {})) {
      if (FORWARDED_PARAMETER_KEYS.has(key) && value !== undefined && value !== null) {
        payload[key] = value;
      }
    }

    if (input.sourceImages?.length) {
      payload.image = input.sourceImages.map(toDataUrl);
    }

    return payload;
  }

  private async parseResponse(response: Response): Promise<SeedreamImageEntry> {
    let payload: SeedreamImageResponse;

    try {
      payload = (await response.json()) as SeedreamImageResponse;
    } catch {
      throw this.createError('IMAGE_INVALID_RESPONSE', '图片生成服务返回了无效响应');
    }

    if (payload.error) {
      throw this.createError(
        'IMAGE_REQUEST_ERROR',
        payload.error.message?.trim() || '图片生成请求失败',
      );
    }

    const entries = Array.isArray(payload.data)
      ? payload.data
      : payload.data && typeof payload.data === 'object'
        ? [payload.data]
        : [];
    const image = entries.find((entry): entry is SeedreamImageEntry => {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
        return false;
      }

      const candidate = entry as Record<string, unknown>;

      return typeof candidate.url === 'string' || typeof candidate.b64_json === 'string';
    });

    if (!image) {
      throw this.createError('IMAGE_INVALID_RESPONSE', '图片生成服务未返回图片');
    }

    return image;
  }

  private async resolveImage(
    image: SeedreamImageEntry,
    signal: AbortSignal,
  ): Promise<GeneratedImage> {
    if (image.b64_json) {
      return normalizeImage(Buffer.from(image.b64_json, 'base64'));
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

    const declaredLength = Number(response.headers.get('content-length'));

    if (Number.isFinite(declaredLength) && declaredLength > MAX_IMAGE_BYTES) {
      throw this.createError('IMAGE_RESULT_TOO_LARGE', '图片结果超过允许的大小');
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const contentType = response.headers.get('content-type')?.split(';')[0]?.trim();

    return normalizeImage(buffer, contentType);
  }

  private resolveApiKey(providerKeyRef?: string): string | undefined {
    const configuredKey = this.configService.get<string>(providerKeyRef?.trim() ?? '')?.trim();

    return (
      configuredKey ||
      this.configService.get<string>('IMAGE_SEEDREAM_API_KEY')?.trim() ||
      this.configService.get<string>('IMAGE_API_KEY')?.trim()
    );
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

function resolveSeedreamSize(parameters: Record<string, unknown> | undefined): string | undefined {
  const explicitSize =
    typeof parameters?.size === 'string' ? parameters.size.trim().toUpperCase() : '';

  if (SUPPORTED_SIZE_PRESETS.has(explicitSize)) {
    return explicitSize;
  }

  if (/^\d{3,5}X\d{3,5}$/.test(explicitSize)) {
    return explicitSize.toLowerCase();
  }

  const ratio = typeof parameters?.ratio === 'string' ? parameters.ratio : '';
  const sizes: Record<string, string> = {
    '1:1': '2048x2048',
    '16:9': '2560x1440',
    '9:16': '1440x2560',
    '4:3': '2304x1728',
    '3:4': '1728x2304',
    '3:2': '2496x1664',
    '2:3': '1664x2496',
  };

  return sizes[ratio] ?? '2048x2048';
}

function toDataUrl(image: NonNullable<GenerateImageInput['sourceImages']>[number]): string {
  return `data:${image.mimeType};base64,${image.buffer.toString('base64')}`;
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
    detected?.mimeType ??
    (declaredMimeType?.startsWith('image/') ? declaredMimeType.toLowerCase() : undefined);
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
