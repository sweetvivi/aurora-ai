import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import sharp from 'sharp';
import type {
  GeneratedVideo,
  GenerateVideoInput,
  VideoGenerationSnapshot,
  VideoProvider,
  VideoSourceImage,
} from '../video-provider';

const DEFAULT_RESULT_MIME_TYPE = 'video/mp4';
// 首帧图片会以 base64 data URL 塞进 JSON 请求体，原图动辄 2-3MB，base64 后更大，
// 上游网关会因为包体过大把 image 丢掉，最后只剩 prompt 生效（生成的视频与原图无关）。
const SOURCE_IMAGE_MAX_EDGE = 1280;
const SOURCE_IMAGE_TARGET_BYTES = 900 * 1024;
const SOURCE_IMAGE_JPEG_QUALITY = 82;

@Injectable()
export class XaiVideoProvider implements VideoProvider {
  readonly supportsLastFrame = false;

  private readonly logger = new Logger(XaiVideoProvider.name);

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
      const requestPayload = await this.createPayload(input);
      let response = await this.postGeneration(
        requestPayload,
        apiKey,
        timeoutController.signal,
        input.providerBaseUrl,
      );

      // 当前 Sub2API 分组不接受 resolution 字段，带上会直接 422；而 422 不会创建任务，
      // 所以退回不带分辨率的请求重试一次，既不丢其他网关节点的能力，也不多扣一次额度。
      if (response.status === 422 && 'resolution' in requestPayload) {
        delete requestPayload.resolution;
        response = await this.postGeneration(
          requestPayload,
          apiKey,
          timeoutController.signal,
          input.providerBaseUrl,
        );
      }

      if (!response.ok) {
        // 上游把具体原因放在 body.error.message 里，例如「image url must be http(s)」。
        // 只报 HTTP 状态码会让「素材没被采纳」这类问题完全看不出来，所以透传原文。
        const detail = await readProviderErrorMessage(response);

        throw this.createError(
          this.providerErrorCode(response.status),
          detail
            ? `视频生成服务返回 HTTP ${response.status}：${detail}`
            : `视频生成服务返回 HTTP ${response.status}`,
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
          result: await this.downloadResult(
            this.resolveAbsoluteUrl(url, options?.providerBaseUrl),
            timeoutController.signal,
            apiKey,
          ),
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

  private postGeneration(
    payload: Record<string, unknown>,
    apiKey: string,
    signal: AbortSignal,
    providerBaseUrl?: string,
  ): Promise<Response> {
    return fetch(`${this.baseUrl(providerBaseUrl)}/videos/generations`, {
      body: JSON.stringify(payload),
      headers: {
        authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
      },
      method: 'POST',
      signal,
    });
  }

  private async createPayload(input: GenerateVideoInput): Promise<Record<string, unknown>> {
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
        url: toDataUrl(await this.prepareSourceImage(input.sourceImage)),
      };
    }

    return payload;
  }

  /**
   * 把首帧图压到网关能接受的体积。原实现直接把原图转 base64 塞进 JSON，
   * 2-3MB 的 PNG 会变成 4MB 以上的请求体，上游会把 image 丢弃、只按 prompt 生成。
   */
  private async prepareSourceImage(image: VideoSourceImage): Promise<VideoSourceImage> {
    if (image.buffer.length <= SOURCE_IMAGE_TARGET_BYTES && image.mimeType === 'image/jpeg') {
      return image;
    }

    try {
      const buffer = await sharp(image.buffer)
        .rotate()
        .resize(SOURCE_IMAGE_MAX_EDGE, SOURCE_IMAGE_MAX_EDGE, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({ mozjpeg: true, quality: SOURCE_IMAGE_JPEG_QUALITY })
        .toBuffer();

      this.logger.log(
        `Source image compressed ${formatKilobytes(image.buffer.length)} -> ${formatKilobytes(buffer.length)}`,
      );

      return {
        buffer,
        mimeType: 'image/jpeg',
        originalName: image.originalName.replace(/\.[^.]+$/, '') + '.jpg',
      };
    } catch (error) {
      this.logger.warn(
        `Source image compression failed, sending original: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );

      return image;
    }
  }

  private async downloadResult(
    url: string,
    signal: AbortSignal,
    apiKey: string,
  ): Promise<GeneratedVideo> {
    // 上游返回的是站内相对地址（例如 /v1/videos/<id>/content），且该地址需要 Bearer 鉴权，
    // 直接把相对地址交给 fetch 会抛 URL 解析错误，最终被上层误判成「视频生成失败」。
    const response = await fetch(url, {
      headers: {
        accept: 'video/*,application/octet-stream;q=0.9,*/*;q=0.5',
        authorization: `Bearer ${apiKey}`,
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

  private resolveAbsoluteUrl(url: string, providerBaseUrl?: string): string {
    if (/^https?:\/\//i.test(url)) {
      return url;
    }

    // base 已带 /v1，上游给的相对地址也以 /v1 开头，用 URL 解析而不是字符串拼接，
    // 避免出现 /v1/v1/... 或丢掉前缀。
    return new URL(url, `${this.baseUrl(providerBaseUrl)}/`).toString();
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

function formatKilobytes(bytes: number): string {
  return `${Math.round(bytes / 1024)}KB`;
}

async function readProviderErrorMessage(response: Response): Promise<string> {
  try {
    const text = await response.text();
    const payload = JSON.parse(text) as unknown;
    const record = readRecord(payload);
    const error = readRecord(record?.error);

    return readString(error?.message) ?? readString(record?.message) ?? text.slice(0, 200);
  } catch {
    return '';
  }
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
