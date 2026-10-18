import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { buildArkApiUrl } from '../provider-protocol';
import type {
  GeneratedVideo,
  GenerateVideoInput,
  VideoGenerationSnapshot,
  VideoProvider,
  VideoSourceImage,
  VideoSourceVideo,
} from '../video-provider';

const DEFAULT_RESULT_MIME_TYPE = 'video/mp4';
const MAX_DURATION_SECONDS = 30;
const FORWARDED_PARAMETER_KEYS = new Set(['camera_fixed', 'frames', 'generate_audio', 'seed']);

@Injectable()
export class SeedanceVideoProvider implements VideoProvider {
  readonly supportsLastFrame = true;

  constructor(private readonly configService: ConfigService) {}

  async createGeneration(input: GenerateVideoInput): Promise<VideoGenerationSnapshot> {
    const apiKey = this.resolveApiKey(input.providerKeyRef);

    if (!apiKey) {
      throw this.createError('VIDEO_NOT_CONFIGURED', '视频生成服务尚未配置');
    }

    const timeoutController = this.createTimeoutController();

    try {
      const baseUrl =
        input.providerBaseUrl?.trim() || this.configService.getOrThrow<string>('VIDEO_BASE_URL');
      const response = await fetch(buildArkApiUrl(baseUrl, '/contents/generations/tasks'), {
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
          `视频生成服务返回 HTTP ${response.status}`,
        );
      }

      const payload = readRecord((await response.json()) as unknown);
      const requestId =
        readString(payload?.id) ?? readString(payload?.task_id) ?? readString(payload?.request_id);

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
      model?: string;
      providerBaseUrl?: string;
      providerCode?: string;
      providerKeyRef?: string;
    },
  ): Promise<VideoGenerationSnapshot> {
    const apiKey = this.resolveApiKey(options?.providerKeyRef);

    if (!apiKey) {
      throw this.createError('VIDEO_NOT_CONFIGURED', '视频生成服务尚未配置');
    }

    const timeoutController = this.createTimeoutController();

    try {
      const baseUrl =
        options?.providerBaseUrl?.trim() || this.configService.getOrThrow<string>('VIDEO_BASE_URL');
      const response = await fetch(
        `${buildArkApiUrl(baseUrl, '/contents/generations/tasks')}/${encodeURIComponent(requestId)}`,
        {
          headers: {
            accept: 'application/json',
            authorization: `Bearer ${apiKey}`,
            'content-type': 'application/json',
          },
          method: 'GET',
          signal: timeoutController.signal,
        },
      );

      if (!response.ok) {
        throw this.createError(
          this.providerErrorCode(response.status),
          `视频任务查询失败 HTTP ${response.status}`,
        );
      }

      const payload = readRecord((await response.json()) as unknown);
      const status = readString(payload?.status)?.toUpperCase();

      if (status === 'SUCCESS' || status === 'SUCCEEDED' || status === 'DONE') {
        const content = readRecord(payload?.content);
        const video = readRecord(payload?.video);
        const url =
          readString(content?.video_url) ??
          readString(payload?.video_url) ??
          readString(video?.url) ??
          readString(payload?.url);

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

      if (status === 'FAILED' || status === 'FAILURE' || status === 'EXPIRED') {
        const providerError = readRecord(payload?.error);

        return {
          errorCode:
            status === 'EXPIRED'
              ? 'VIDEO_PROVIDER_TASK_NOT_FOUND'
              : this.mapProviderErrorCode(readString(providerError?.code)),
          errorMessage:
            readString(providerError?.message) ??
            readString(payload?.fail_reason) ??
            (status === 'EXPIRED' ? '视频任务已过期，请重新提交' : '视频生成失败，请重试'),
          progress: readProgress(payload?.progress, 100),
          requestId,
          status: 'FAILED',
        };
      }

      if (status === 'CANCELLED' || status === 'CANCELED') {
        return {
          errorCode: 'VIDEO_GENERATION_FAILED',
          errorMessage: '视频任务已取消，请重新提交',
          progress: readProgress(payload?.progress, 100),
          requestId,
          status: 'FAILED',
        };
      }

      return {
        progress: readProgress(payload?.progress, isRunningStatus(status) ? 50 : 10),
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
    const content: Array<Record<string, unknown>> = [];

    for (const image of [input.sourceImage, input.lastFrameImage]) {
      if (image) {
        content.push({
          image_url: {
            url: toDataUrl(image),
          },
          type: 'image_url',
        });
      }
    }

    if (input.referenceVideo) {
      content.push({
        type: 'video_url',
        video_url: {
          url: toDataUrl(input.referenceVideo),
        },
      });
    }

    content.push({
      text: input.prompt,
      type: 'text',
    });

    const payload: Record<string, unknown> = {
      content,
      model:
        input.model ??
        this.configService.get<string>('VIDEO_SEEDANCE_DEFAULT_MODEL') ??
        this.configService.get<string>('VIDEO_DEFAULT_MODEL', 'doubao-seedance-1-0-pro-250528'),
    };
    const duration = resolveDuration(input.parameters);
    const ratio = resolveAspectRatio(input.parameters);
    const resolution = resolveResolution(input.parameters);

    if (duration !== undefined) {
      payload.duration = duration;
    }

    if (ratio) {
      payload.ratio = ratio;
    }

    if (resolution) {
      payload.resolution = resolution;
    }

    for (const [key, value] of Object.entries(input.parameters ?? {})) {
      if (FORWARDED_PARAMETER_KEYS.has(key) && value !== undefined && value !== null) {
        payload[key] = value;
      }
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

  private resolveApiKey(providerKeyRef?: string): string | undefined {
    const configuredKey = this.configService.get<string>(providerKeyRef?.trim() ?? '')?.trim();

    return (
      configuredKey ||
      this.configService.get<string>('VIDEO_SEEDANCE_API_KEY')?.trim() ||
      this.configService.get<string>('VIDEO_API_KEY')?.trim()
    );
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

function toDataUrl(image: VideoSourceImage | VideoSourceVideo): string {
  return `data:${image.mimeType};base64,${image.buffer.toString('base64')}`;
}

function resolveDuration(parameters: Record<string, unknown> | undefined): number | undefined {
  const value = Number(parameters?.duration);

  if (!Number.isFinite(value)) {
    return undefined;
  }

  return Math.max(1, Math.min(MAX_DURATION_SECONDS, Math.round(value)));
}

function resolveAspectRatio(parameters: Record<string, unknown> | undefined): string | undefined {
  const value = typeof parameters?.ratio === 'string' ? parameters.ratio : '';

  return ['1:1', '16:9', '9:16', '4:3', '3:4', '3:2', '2:3', '21:9'].includes(value)
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

  return ['480p', '720p', '1080p', '4k'].includes(value) ? value : undefined;
}

function readProgress(value: unknown, fallback: number): number {
  const progress = Number(value);

  if (Number.isFinite(progress)) {
    return Math.max(0, Math.min(100, Math.round(progress)));
  }

  if (typeof value === 'string' && value.endsWith('%')) {
    const percentage = Number(value.slice(0, -1));

    if (Number.isFinite(percentage)) {
      return Math.max(0, Math.min(100, Math.round(percentage)));
    }
  }

  return fallback;
}

function isRunningStatus(status: string | undefined): boolean {
  return status === 'IN_PROGRESS' || status === 'PROCESSING' || status === 'RUNNING';
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
