import {
  BadGatewayException,
  BadRequestException,
  GatewayTimeoutException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ProbeProviderDto } from './dto/probe-provider.dto';

type DetectedCapability = 'chat' | 'embedding' | 'image' | 'video';

export interface DiscoveredProviderModel {
  capabilities: DetectedCapability[];
  displayName: string;
  providerModel: string;
  suggestedAlias: string;
}

export interface ProviderProbeResult {
  checkedAt: string;
  latencyMs: number;
  modelCount: number;
  models: DiscoveredProviderModel[];
  protocol: ProbeProviderDto['protocol'];
  truncated: boolean;
}

const MAX_DISCOVERED_MODELS = 200;

@Injectable()
export class ProviderProbeService {
  constructor(private readonly configService: ConfigService) {}

  async probe(input: ProbeProviderDto): Promise<ProviderProbeResult> {
    const apiKey = this.resolveApiKey(input);
    const baseUrl = input.baseUrl.trim().replace(/\/+$/, '');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), input.timeoutMs ?? 10_000);
    const startedAt = performance.now();

    try {
      const response = await fetch(`${baseUrl}/models`, {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'User-Agent': 'aurora-admin-model-probe/1.0',
        },
        signal: controller.signal,
      });
      const latencyMs = Math.max(0, Math.round(performance.now() - startedAt));

      if (!response.ok) {
        throw this.providerHttpError(response.status);
      }

      const payload = await this.parseJson(response);
      const models = this.extractModels(payload, input.providerCode ?? 'provider');

      return {
        checkedAt: new Date().toISOString(),
        latencyMs,
        modelCount: models.length,
        models: models.slice(0, MAX_DISCOVERED_MODELS),
        protocol: input.protocol,
        truncated: models.length > MAX_DISCOVERED_MODELS,
      };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new GatewayTimeoutException({
          code: 'PROVIDER_PROBE_TIMEOUT',
          message: '厂商在限定时间内没有响应模型列表',
        });
      }

      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  private resolveApiKey(input: ProbeProviderDto): string {
    const transientKey = input.apiKey?.trim();

    if (transientKey) {
      return transientKey;
    }

    const keyRef = input.keyRef?.trim();
    const configuredKey = keyRef ? this.configService.get<string>(keyRef)?.trim() : undefined;

    if (!configuredKey) {
      throw new BadRequestException({
        code: 'PROVIDER_KEY_REQUIRED',
        message: '请提供本次检测使用的 API Key，或先配置对应的服务端环境变量',
      });
    }

    return configuredKey;
  }

  private async parseJson(response: Response): Promise<unknown> {
    try {
      return await response.json();
    } catch {
      throw new BadGatewayException({
        code: 'PROVIDER_INVALID_RESPONSE',
        message: '厂商返回的模型列表不是有效 JSON',
      });
    }
  }

  private extractModels(payload: unknown, providerCode: string): DiscoveredProviderModel[] {
    const source = this.modelArray(payload);

    if (!source) {
      throw new BadGatewayException({
        code: 'PROVIDER_MODEL_LIST_UNSUPPORTED',
        message: '厂商响应中没有可识别的模型列表',
      });
    }

    const seen = new Set<string>();
    const models: DiscoveredProviderModel[] = [];

    for (const item of source) {
      const record = this.asRecord(item);
      const providerModel = this.readString(record, ['id', 'name', 'model']);

      if (!providerModel || seen.has(providerModel)) {
        continue;
      }

      seen.add(providerModel);
      const displayName =
        this.readString(record, ['display_name', 'displayName', 'name']) ?? providerModel;
      const explicitCapabilities = this.readCapabilities(record?.capabilities);

      models.push({
        capabilities: explicitCapabilities.length
          ? explicitCapabilities
          : this.inferCapabilities(providerModel),
        displayName: displayName.slice(0, 80),
        providerModel: providerModel.slice(0, 160),
        suggestedAlias: this.suggestAlias(providerCode, providerModel),
      });
    }

    return models.sort((left, right) => left.providerModel.localeCompare(right.providerModel));
  }

  private modelArray(payload: unknown): unknown[] | null {
    if (Array.isArray(payload)) {
      return payload;
    }

    const record = this.asRecord(payload);

    if (!record) {
      return null;
    }

    for (const key of ['data', 'models', 'items']) {
      if (Array.isArray(record[key])) {
        return record[key];
      }
    }

    return null;
  }

  private asRecord(value: unknown): Record<string, unknown> | null {
    return value !== null && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null;
  }

  private readString(record: Record<string, unknown> | null, keys: string[]): string | null {
    if (!record) {
      return null;
    }

    for (const key of keys) {
      const value = record[key];

      if (typeof value === 'string' && value.trim()) {
        return value.trim();
      }
    }

    return null;
  }

  private readCapabilities(value: unknown): DetectedCapability[] {
    if (!Array.isArray(value)) {
      return [];
    }

    const normalized = value
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.toLowerCase())
      .filter((item): item is DetectedCapability =>
        ['chat', 'embedding', 'image', 'video'].includes(item),
      );

    return [...new Set(normalized)];
  }

  private inferCapabilities(modelId: string): DetectedCapability[] {
    const normalized = modelId.toLowerCase();

    if (/(^|[-_/])embed|embedding|bge-|text-embedding/.test(normalized)) {
      return ['embedding'];
    }

    if (
      /(^|[-_/])(image|imagen|flux|seedream|sd|stable-diffusion|midjourney)|dall-e|gpt-image|qwen-image|imagegen/.test(
        normalized,
      )
    ) {
      return ['image'];
    }

    if (
      /(^|[-_/])(video|veo|sora|kling|seedance|wan|pika)|imagine-video|video-gen|videogen/.test(
        normalized,
      )
    ) {
      return ['video'];
    }

    return ['chat'];
  }

  private suggestAlias(providerCode: string, modelId: string): string {
    const raw = `${providerCode}-${modelId}`
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, '-')
      .replace(/[-_.]{2,}/g, '-')
      .replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, '');
    const alias = /^[a-z0-9]/.test(raw) ? raw : `model-${raw}`;

    return alias.slice(0, 80).replace(/[^a-z0-9]+$/g, '');
  }

  private providerHttpError(status: number) {
    if (status === 401 || status === 403) {
      return new BadGatewayException({
        code: 'PROVIDER_AUTH_FAILED',
        message: 'API Key 被厂商拒绝，请检查密钥或权限',
      });
    }

    if (status === 404) {
      return new BadGatewayException({
        code: 'PROVIDER_MODEL_LIST_UNSUPPORTED',
        message: '该地址没有提供兼容的模型列表接口',
      });
    }

    if (status === 429) {
      return new BadGatewayException({
        code: 'PROVIDER_RATE_LIMITED',
        message: '厂商暂时限制了模型列表请求，请稍后重试',
      });
    }

    if (status >= 500) {
      return new BadGatewayException({
        code: 'PROVIDER_UNAVAILABLE',
        message: `厂商服务暂时不可用（HTTP ${status}）`,
      });
    }

    return new BadGatewayException({
      code: 'PROVIDER_PROBE_FAILED',
      message: `模型列表请求失败（HTTP ${status}）`,
    });
  }
}
