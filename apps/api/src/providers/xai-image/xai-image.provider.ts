import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import sharp from 'sharp';
import type { GeneratedImage, GenerateImageInput, ImageProvider } from '../image-provider';

interface XaiImageResponse {
  data?: Array<{
    b64_json?: string;
    mime_type?: string;
    url?: string;
  }>;
}

const SOURCE_IMAGE_MAX_EDGE = 1024;
const SOURCE_IMAGE_JPEG_QUALITY = 85;

/**
 * Grok 生图通道（x.ai images/generations）。
 *
 * 两个与 OpenAI 兼容通道的关键差异：
 * 1. 返回的是 x.ai CDN 链接（imgen.x.ai），本机网络解析被污染直连不通，
 *    所以固定请求 `response_format: 'b64_json'`，让网关直接把图片内联回来。
 * 2. 传入图片只作为「参考」，输出会整体重绘，不具备保真编辑能力；
 *    该限制在模型 profile 里以 `supportsImageEdit: false` 表达。
 */
@Injectable()
export class XaiImageProvider implements ImageProvider {
  private readonly logger = new Logger(XaiImageProvider.name);

  constructor(private readonly configService: ConfigService) {}

  async generateImage(input: GenerateImageInput): Promise<GeneratedImage> {
    const apiKey = this.apiKey(input.providerKeyRef);

    if (!apiKey) {
      throw this.createError('IMAGE_NOT_CONFIGURED', 'Grok 生图服务尚未配置密钥');
    }

    const timeoutController = new AbortController();
    const timeoutMs = this.configService.get<number>('IMAGE_REQUEST_TIMEOUT_MS', 180_000);
    const timeout = setTimeout(() => timeoutController.abort(), timeoutMs);

    try {
      const payload = await this.createPayload(input);
      const response = await fetch(`${this.baseUrl(input.providerBaseUrl)}/images/generations`, {
        body: JSON.stringify(payload),
        headers: {
          authorization: `Bearer ${apiKey}`,
          'content-type': 'application/json',
        },
        method: 'POST',
        signal: timeoutController.signal,
      });

      if (!response.ok) {
        throw this.createError(
          this.providerErrorCode(response.status),
          `Grok 生图服务返回 HTTP ${response.status}`,
        );
      }

      return await this.resolveImage(response, timeoutController.signal);
    } catch (error) {
      if (timeoutController.signal.aborted) {
        throw this.createError('IMAGE_TIMEOUT', '图片生成请求超时，请重试');
      }

      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  private async createPayload(input: GenerateImageInput): Promise<Record<string, unknown>> {
    const model =
      input.model ??
      this.configService.get<string>('IMAGE_GROK_DEFAULT_MODEL', 'grok-imagine-image');
    const payload: Record<string, unknown> = {
      model,
      n: 1,
      prompt: input.prompt,
      response_format: 'b64_json',
    };
    const source = input.sourceImages?.[0];

    if (source) {
      const compressed = await this.compress(source);
      payload.image = `data:${compressed.mimeType};base64,${compressed.buffer.toString('base64')}`;
    }

    return payload;
  }

  private async resolveImage(response: Response, signal: AbortSignal): Promise<GeneratedImage> {
    let payload: XaiImageResponse;

    try {
      payload = (await response.json()) as XaiImageResponse;
    } catch {
      throw this.createError('IMAGE_INVALID_RESPONSE', 'Grok 生图服务返回了无效响应');
    }

    const image = payload.data?.[0];

    if (image?.b64_json) {
      return this.normalize(Buffer.from(image.b64_json, 'base64'), image.mime_type);
    }

    if (!image?.url) {
      throw this.createError('IMAGE_INVALID_RESPONSE', 'Grok 生图服务未返回图片');
    }

    // 兜底：部分分组忽略 response_format，只给 CDN 链接。本机无法直连时给出可读原因，
    // 而不是笼统的「生成失败」。
    try {
      const download = await fetch(image.url, { signal });

      if (!download.ok) {
        throw new Error(`HTTP ${download.status}`);
      }

      return this.normalize(
        Buffer.from(await download.arrayBuffer()),
        download.headers.get('content-type')?.split(';')[0],
      );
    } catch (error) {
      this.logger.warn(
        `Grok image download failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw this.createError(
        'IMAGE_RESULT_DOWNLOAD_FAILED',
        'Grok 返回的是外链图片，本机无法访问该地址，请稍后重试',
      );
    }
  }

  private async compress(source: {
    buffer: Buffer;
    mimeType: string;
    originalName: string;
  }): Promise<{ buffer: Buffer; mimeType: string }> {
    try {
      const buffer = await sharp(source.buffer)
        .rotate()
        .resize(SOURCE_IMAGE_MAX_EDGE, SOURCE_IMAGE_MAX_EDGE, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({ mozjpeg: true, quality: SOURCE_IMAGE_JPEG_QUALITY })
        .toBuffer();

      return { buffer, mimeType: 'image/jpeg' };
    } catch (error) {
      this.logger.warn(
        `Source image compression failed, sending original: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );

      return { buffer: source.buffer, mimeType: source.mimeType };
    }
  }

  private normalize(buffer: Buffer, mimeType?: string): GeneratedImage {
    if (buffer.length === 0) {
      throw this.createError('IMAGE_INVALID_RESPONSE', 'Grok 生图服务未返回图片');
    }

    const resolvedMimeType = mimeType?.trim() || this.detectMimeType(buffer);

    return {
      buffer,
      extension: resolvedMimeType === 'image/png' ? 'png' : 'jpg',
      mimeType: resolvedMimeType,
    };
  }

  private detectMimeType(buffer: Buffer): string {
    return buffer.subarray(0, 4).toString('hex') === '89504e47' ? 'image/png' : 'image/jpeg';
  }

  private baseUrl(providerBaseUrl?: string): string {
    return (
      providerBaseUrl?.trim() ||
      this.configService.get<string>('IMAGE_GROK_BASE_URL')?.trim() ||
      this.configService.getOrThrow<string>('IMAGE_BASE_URL')
    ).replace(/\/+$/, '');
  }

  private apiKey(providerKeyRef?: string): string | undefined {
    const keys = providerKeyRef?.trim()
      ? [providerKeyRef, 'IMAGE_GROK_API_KEY']
      : ['IMAGE_GROK_API_KEY'];

    for (const key of keys) {
      const value = this.configService.get<string>(key);

      if (value?.trim()) {
        return value.trim();
      }
    }

    return undefined;
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
