import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomUUID } from 'node:crypto';
import type {
  GenerateVideoInput,
  GeneratedVideo,
  VideoGenerationSnapshot,
  VideoProvider,
} from '../video-provider';

interface MockVideoJob {
  createdAt: number;
  input: GenerateVideoInput;
  totalMs: number;
}

@Injectable()
export class MockVideoProvider implements VideoProvider {
  private readonly jobs = new Map<string, MockVideoJob>();
  private readonly mockDurationMs: number;

  constructor(configService: ConfigService) {
    this.mockDurationMs = configService.get<number>('VIDEO_MOCK_DURATION_MS', 4_000);
  }

  async createGeneration(input: GenerateVideoInput): Promise<VideoGenerationSnapshot> {
    const requestId = `mock-video-${randomUUID()}`;

    this.jobs.set(requestId, {
      createdAt: Date.now(),
      input,
      totalMs: Math.max(0, this.mockDurationMs),
    });

    return {
      progress: 2,
      requestId,
      status: 'PROCESSING',
    };
  }

  async pollGeneration(requestId: string): Promise<VideoGenerationSnapshot> {
    const job = this.jobs.get(requestId);

    if (!job) {
      return {
        errorCode: 'VIDEO_PROVIDER_TASK_NOT_FOUND',
        errorMessage: '演示任务已失效，请重新提交',
        progress: 0,
        requestId,
        status: 'FAILED',
      };
    }

    if (job.totalMs === 0) {
      this.jobs.delete(requestId);

      return {
        progress: 100,
        requestId,
        result: createMockVideo(job.input),
        status: 'SUCCEEDED',
      };
    }

    const progress = Math.min(100, Math.round(((Date.now() - job.createdAt) / job.totalMs) * 100));

    if (progress < 100) {
      return {
        progress: Math.max(4, Math.min(progress, 96)),
        requestId,
        status: 'PROCESSING',
      };
    }

    this.jobs.delete(requestId);

    return {
      progress: 100,
      requestId,
      result: createMockVideo(job.input),
      status: 'SUCCEEDED',
    };
  }
}

function createMockVideo(input: GenerateVideoInput): GeneratedVideo {
  const duration = resolveDuration(input.parameters);
  const ratio = resolveRatio(input.parameters);
  const [width, height] = dimensionsForRatio(ratio);
  const seed = createHash('sha256').update(input.prompt).digest();
  const primary = hsl(seed[0] ?? 220, 72, 48);
  const secondary = hsl(seed[1] ?? 280, 76, 56);
  const tertiary = hsl(seed[2] ?? 160, 70, 48);
  const title = escapeXml(input.prompt.slice(0, 68));
  const sourceLabel = input.sourceImage ? '图生视频' : '文生视频';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#090a12"/>
      <stop offset="1" stop-color="#171126"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="45%" r="62%">
      <stop offset="0" stop-color="${primary}" stop-opacity=".9"/>
      <stop offset=".46" stop-color="${secondary}" stop-opacity=".42"/>
      <stop offset="1" stop-color="${tertiary}" stop-opacity="0"/>
    </radialGradient>
    <filter id="blur"><feGaussianBlur stdDeviation="28"/></filter>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#bg)"/>
  <ellipse cx="${Math.round(width * 0.48)}" cy="${Math.round(height * 0.45)}" rx="${Math.round(width * 0.31)}" ry="${Math.round(height * 0.33)}" fill="url(#glow)" filter="url(#blur)">
    <animate attributeName="cx" values="${Math.round(width * 0.4)};${Math.round(width * 0.58)};${Math.round(width * 0.4)}" dur="5s" repeatCount="indefinite"/>
    <animate attributeName="cy" values="${Math.round(height * 0.42)};${Math.round(height * 0.55)};${Math.round(height * 0.42)}" dur="4s" repeatCount="indefinite"/>
  </ellipse>
  <g opacity=".9">
    <circle cx="${Math.round(width * 0.24)}" cy="${Math.round(height * 0.32)}" r="${Math.round(Math.min(width, height) * 0.06)}" fill="${tertiary}">
      <animate attributeName="opacity" values=".28;.9;.28" dur="2.6s" repeatCount="indefinite"/>
    </circle>
    <circle cx="${Math.round(width * 0.77)}" cy="${Math.round(height * 0.62)}" r="${Math.round(Math.min(width, height) * 0.08)}" fill="${secondary}">
      <animate attributeName="opacity" values=".8;.3;.8" dur="3.3s" repeatCount="indefinite"/>
    </circle>
  </g>
  <rect x="34" y="${height - 138}" width="${width - 68}" height="104" rx="18" fill="#08090d" fill-opacity=".72" stroke="#ffffff" stroke-opacity=".12"/>
  <text x="58" y="${height - 97}" fill="#ffffff" font-family="Microsoft YaHei, Noto Sans SC, sans-serif" font-size="18" font-weight="700">${title}</text>
  <text x="58" y="${height - 65}" fill="#b8b5ca" font-family="Microsoft YaHei, Noto Sans SC, sans-serif" font-size="12">${sourceLabel} · ${ratio} · ${duration}s · 本地演示视频</text>
  <text x="${width - 58}" y="54" text-anchor="end" fill="#ffffff" fill-opacity=".74" font-family="Arial, sans-serif" font-size="12">AURORA MOCK</text>
</svg>`;

  return {
    buffer: Buffer.from(svg, 'utf8'),
    extension: 'svg',
    mimeType: 'image/svg+xml',
  };
}

function resolveDuration(parameters: Record<string, unknown> | undefined): number {
  const value = Number(parameters?.duration);

  return Number.isFinite(value) ? Math.max(1, Math.min(15, Math.round(value))) : 5;
}

function resolveRatio(parameters: Record<string, unknown> | undefined): string {
  const value = typeof parameters?.ratio === 'string' ? parameters.ratio : '16:9';

  return ['16:9', '9:16', '1:1'].includes(value) ? value : '16:9';
}

function dimensionsForRatio(ratio: string): [number, number] {
  if (ratio === '9:16') {
    return [720, 1_280];
  }

  if (ratio === '1:1') {
    return [960, 960];
  }

  return [1_280, 720];
}

function hsl(hue: number, saturation: number, lightness: number): string {
  return `hsl(${Math.round((hue / 255) * 360)} ${saturation}% ${lightness}%)`;
}

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}
