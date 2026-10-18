import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  GeneratedVideo,
  GenerateVideoInput,
  VideoGenerationSnapshot,
  VideoProvider,
  VideoSourceImage,
} from '../video-provider';

const DEFAULT_RESULT_MIME_TYPE = 'video/mp4';

@Injectable()
export class XaiVideoProvider implements VideoProvider {
  readonly supportsLastFrame = false;

  constructor(private readonly configService: ConfigService) {}

  async createGeneration(input: GenerateVideoInput): Promise<VideoGenerationSnapshot> {
    if (input.lastFrameImage) {
      throw this.createError(
        'VIDEO_LAST_FRAME_UNSUPPORTED',
        '当前真实视频模型暂不支持首尾帧模式，请切换为文生视频或图生视频',
      );
    }

    if (input.referenceVideo) {
      throw this.createError(
        'VIDEO_INPUT_UNSUPPORTED',
        '当前真实视频模型暂不支持参考视频，请切换其他生成方式',
      );
    }

    const apiKey = this.resolveApiKey(input.providerKeyRef);

    if (!apiKey) {
      throw this.createError('VIDEO_NOT_CONFIGURED', '视频生成服务尚未配置');
    }

    const timeoutController = this.createTimeoutController();

    try {
      const response = await fetch(`${this.baseUrl(input.providerBaseUrl)}/videos/generations`, {
        body: JSON.stringify(this.createPayload(input)),
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
          `视频生成服务返回 HTTP ${response.status}`,
        );
      }

      const payload = (await response.json()) as unknown;
      const requestId = readString(readRecord(payload)?.request_id);

      if (!requestId) {
        throw this.createError('VIDEO_INVALID_RESPONSE', '视频生成服务未返回任务 ID');
      }

      return {
        progress: 1,
        requestId,
        status: 'PROCESSING',
      };
    } catch (error) {
      if (timeoutController.signal.aborted) {
        throw this.createError('VIDEO_TIMEOUT', '视频生成请求超时，请重试');
      }

      throw error;
    } finally {
      clearTimeout(timeoutController.timer);
    }
  }

  async pollGeneration(
    requestId: string,
    options?: {
      providerBaseUrl?: string;
      providerKeyRef?: string;
    },
  ): Promise<VideoGenerationSnapshot> {
    const apiKey = this.resolveApiKey(options?.providerKeyRef);

    if (!apiKey) {
      throw this.createError('VIDEO_NOT_CONFIGURED', '视频生成服务尚未配置');
    }

    const timeoutController = this.createTimeoutController();

    try {
      const response = await fetch(
        `${this.baseUrl(options?.providerBaseUrl)}/videos/${encodeURIComponent(requestId)}`,
        {
          headers: {
            authorization: `Bearer ${apiKey}`,
            accept: 'application/json',
          },
          method: 'GET',
          signal: timeoutController.signal,
        },
      );

      if (response.status === 202) {
        return {
          progress: 5,
          requestId,
          status: 'PROCESSING',
        };
      }

      if (!response.ok) {
        throw this.createError(
          this.providerErrorCode(response.status),
          `视频任务查询失败 HTTP ${response.status}`,
        );
      }

      const payload = readRecord((await response.json()) as unknown);
      const status = readString(payload?.status)?.toLowerCase();

      if (status === 'done' || status === 'succeeded' || status === 'success') {
        const video = readRecord(payload?.video);
        const url = readString(video?.url);

        if (!url) {
          throw this.createError('VIDEO_INVALID_RESPONSE', '视频生成服务未返回视频地址');
        }

        return {
          progress: 100,
          requestId,
          result: await this.downloadResult(url, timeoutController.signal),
          status: 'SUCCEEDED',
        };
      }

      if (status === 'failed' || status === 'error' || status === 'cancelled') {
        const providerError = readRecord(payload?.error);

        return {
          errorCode: this.mapProviderErrorCode(readString(providerError?.code)),
          errorMessage: readString(providerError?.message) ?? '视频生成失败，请重试',
          progress: readProgress(payload?.progress),
          requestId,
          status: 'FAILED',
        };
      }

      return {
        progress: readProgress(payload?.progress),
        requestId,
        status: 'PROCESSING',
      };
    } catch (error) {
      if (timeoutController.signal.aborted) {
        throw this.createError('VIDEO_TIMEOUT', '视频任务查询超时，请稍后重试');
      }

      throw error;
    } finally {
      clearTimeout(timeoutController.timer);
    }
  }

  private createPayload(input: GenerateVideoInput): Record<string, unknown> {
    const payload: Record<string, unknown> = {
      model:
        input.model ?? this.configService.get<string>('VIDEO_DEFAULT_MODEL', 'grok-imagine-video'),
      prompt: input.prompt,
    };
    const duration = resolveDuration(input.parameters);
    const ratio = resolveAspectRatio(input.parameters);
    const resolution = resolveResolution(input.parameters);

    if (duration !== undefined) {
      payload.duration = duration;
    }

    if (!input.sourceImage && ratio) {
      payload.aspect_ratio = ratio;
    }

    if (resolution) {
      payload.resolution = resolution;
    }

    if (input.sourceImage) {
      payload.image = {
        url: toDataUrl(input.sourceImage),
      };
    }

    return payload;
  }

  private async downloadResult(url: string, signal: AbortSignal): Promise<GeneratedVideo> {
    const response = await fetch(url, {
      headers: {
        accept: 'video/*,application/octet-stream;q=0.9,*/*;q=0.5',
      },
      signal,
    });

    if (!response.ok) {
      throw this.createError(
        'VIDEO_RESULT_DOWNLOAD_FAILED',
        `视频结果下载失败 HTTP ${response.status}`,
      );
    }

    const declaredLength = Number(response.headers.get('content-length'));
    const maxBytes = this.configService.get<number>('VIDEO_RESULT_MAX_BYTES', 300 * 1024 * 1024);

    if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
      throw this.createError('VIDEO_RESULT_TOO_LARGE', '视频结果超过允许的大小');
    }

    const buffer = Buffer.from(await response.arrayBuffer());

    if (buffer.length === 0) {
      throw this.createError('VIDEO_PROVIDER_INVALID_RESULT', '视频生成服务返回了空结果');
    }

    if (buffer.length > maxBytes) {
      throw this.createError('VIDEO_RESULT_TOO_LARGE', '视频结果超过允许的大小');
    }

    const contentType = response.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase();
    const detected = detectVideoType(buffer);
    const mimeType =
      detected?.mimeType ??
      (contentType?.startsWith('video/') ? contentType : DEFAULT_RESULT_MIME_TYPE);
    const extension = detected?.extension ?? extensionFromMimeType(mimeType) ?? 'mp4';

    return {
      buffer,
      extension,
      mimeType,
    };
  }

  private baseUrl(providerBaseUrl?: string): string {
    return (
      providerBaseUrl?.trim() || this.configService.getOrThrow<string>('VIDEO_BASE_URL')
    ).replace(/\/+$/, '');
  }

  private resolveApiKey(providerKeyRef?: string): string | undefined {
    const configuredKeyRef = providerKeyRef?.trim();

    return this.configService.get<string>(configuredKeyRef || 'VIDEO_API_KEY')?.trim();
  }

  private createTimeoutController(): { signal: AbortSignal; timer: NodeJS.Timeout } {
    const timeoutMs = this.configService.get<number>('VIDEO_REQUEST_TIMEOUT_MS', 180_000);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    timer.unref();

    return {
      signal: controller.signal,
      timer,
    };
  }

  private providerErrorCode(status: number): string {
    if (status === 401 || status === 403) {
      return 'VIDEO_AUTH_ERROR';
    }

    if (status === 429) {
      return 'VIDEO_RATE_LIMITED';
    }

    if (status === 404) {
      return 'VIDEO_PROVIDER_TASK_NOT_FOUND';
    }

    if (status >= 500) {
      return 'VIDEO_PROVIDER_UNAVAILABLE';
    }

    return 'VIDEO_REQUEST_ERROR';
  }

  private mapProviderErrorCode(code: string | undefined): string {
    if (code === 'permission_denied') {
      return 'VIDEO_AUTH_ERROR';
    }

    if (code === 'service_unavailable') {
      return 'VIDEO_PROVIDER_UNAVAILABLE';
    }

    if (code === 'invalid_argument' || code === 'failed_precondition') {
      return 'VIDEO_REQUEST_ERROR';
    }

    return 'VIDEO_GENERATION_FAILED';
  }

  private createError(code: string, message: string): ServiceUnavailableException {
    return new ServiceUnavailableException({ code, message });
  }
}

function toDataUrl(image: VideoSourceImage): string {
  return `data:${image.mimeType};base64,${image.buffer.toString('base64')}`;
}

function resolveDuration(parameters: Record<string, unknown> | undefined): number | undefined {
  const value = Number(parameters?.duration);

  if (!Number.isFinite(value)) {
    return undefined;
  }

  return Math.max(1, Math.min(15, Math.round(value)));
}

function resolveAspectRatio(parameters: Record<string, unknown> | undefined): string | undefined {
  const value = typeof parameters?.ratio === 'string' ? parameters.ratio : '';

  return ['1:1', '16:9', '9:16', '4:3', '3:4', '3:2', '2:3', '21:9', '5:2'].includes(value)
    ? value
    : undefined;
}

function resolveResolution(parameters: Record<string, unknown> | undefined): string | undefined {
  const value =
    typeof parameters?.resolution === 'string'
      ? parameters.resolution.toLowerCase()
      : typeof parameters?.size === 'string'
        ? parameters.size.toLowerCase()
        : '';

  return ['480p', '720p', '1080p'].includes(value) ? value : undefined;
}

function readProgress(value: unknown): number {
  const progress = Number(value);

  return Number.isFinite(progress) ? Math.max(0, Math.min(100, Math.round(progress))) : 5;
}

function readRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function detectVideoType(buffer: Buffer): { extension: string; mimeType: string } | undefined {
  if (buffer.length >= 12 && buffer.toString('ascii', 4, 8) === 'ftyp') {
    return { extension: 'mp4', mimeType: 'video/mp4' };
  }

  if (
    buffer.length >= 4 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBM'
  ) {
    return { extension: 'webm', mimeType: 'video/webm' };
  }

  return undefined;
}

function extensionFromMimeType(mimeType: string): string | undefined {
  const extensions: Record<string, string> = {
    'video/mp4': 'mp4',
    'video/quicktime': 'mov',
    'video/webm': 'webm',
  };

  return extensions[mimeType];
}
