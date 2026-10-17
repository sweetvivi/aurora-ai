import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { LlmProvider, StreamChatEvent, StreamChatRequest } from '../llm-provider';
import { parseServerSentEvents } from './sse-parser';

interface OpenAiStreamPayload {
  choices?: Array<{
    delta?: {
      content?: string;
      reasoning?: string;
      reasoning_content?: string;
    };
  }>;
}

interface ProviderCredentialSource {
  apiKeyName: string;
  baseUrlName: string;
}

const DEFAULT_CREDENTIAL_SOURCE: ProviderCredentialSource = {
  apiKeyName: 'LLM_API_KEY',
  baseUrlName: 'LLM_BASE_URL',
};

const PROVIDER_CREDENTIAL_SOURCES: Record<string, ProviderCredentialSource> = {
  deepseek: {
    apiKeyName: 'LLM_DEEPSEEK_API_KEY',
    baseUrlName: 'LLM_DEEPSEEK_BASE_URL',
  },
  jiguang: DEFAULT_CREDENTIAL_SOURCE,
  qwen: {
    apiKeyName: 'LLM_QWEN_API_KEY',
    baseUrlName: 'LLM_QWEN_BASE_URL',
  },
};

@Injectable()
export class OpenAiCompatibleProvider implements LlmProvider {
  constructor(private readonly configService: ConfigService) {}

  async *streamChat(request: StreamChatRequest): AsyncGenerator<StreamChatEvent> {
    if (this.configService.get<boolean>('LLM_MOCK_MODE', false)) {
      yield* this.streamMock(request);
      return;
    }

    const credentials = this.resolveCredentials(request);
    const apiKey = credentials.apiKey;

    if (!apiKey) {
      throw new ServiceUnavailableException({
        code: 'LLM_NOT_CONFIGURED',
        message: `${credentials.apiKeyName} is not configured`,
      });
    }

    const timeoutController = new AbortController();
    const timeoutMs = this.configService.get<number>('LLM_REQUEST_TIMEOUT_MS', 120_000);
    const timeout = setTimeout(() => timeoutController.abort(), timeoutMs);
    const signal = request.signal
      ? AbortSignal.any([request.signal, timeoutController.signal])
      : timeoutController.signal;

    try {
      const baseUrl = credentials.baseUrl.replace(/\/+$/, '');
      const response = await fetch(`${baseUrl}/chat/completions`, {
        body: JSON.stringify({
          messages: request.messages,
          model: request.model,
          stream: true,
          temperature: request.temperature,
        }),
        headers: {
          authorization: `Bearer ${apiKey}`,
          'content-type': 'application/json',
        },
        method: 'POST',
        signal,
      });

      if (!response.ok) {
        throw new ServiceUnavailableException({
          code: this.providerErrorCode(response.status),
          message: `LLM provider returned HTTP ${response.status}`,
        });
      }

      if (!response.body) {
        throw new ServiceUnavailableException({
          code: 'LLM_EMPTY_RESPONSE',
          message: 'LLM provider returned an empty stream',
        });
      }

      let hasContent = false;
      let hasReasoningContent = false;

      for await (const data of parseServerSentEvents(response.body)) {
        if (data === '[DONE]') {
          break;
        }

        const payload = this.parsePayload(data);
        const delta = payload.choices?.[0]?.delta;
        const content = delta?.content;

        if (content) {
          hasContent = true;
          yield { content, type: 'delta' };
        }

        if (delta?.reasoning_content || delta?.reasoning) {
          hasReasoningContent = true;
        }
      }

      if (!hasContent) {
        throw new ServiceUnavailableException({
          code: 'LLM_EMPTY_RESPONSE',
          message: hasReasoningContent
            ? 'LLM provider returned reasoning content without a final answer'
            : 'LLM provider returned an empty response',
        });
      }

      yield { type: 'done' };
    } catch (error) {
      if (timeoutController.signal.aborted && !request.signal?.aborted) {
        throw new ServiceUnavailableException({
          code: 'LLM_TIMEOUT',
          message: 'LLM provider request timed out',
        });
      }

      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  private async *streamMock(request: StreamChatRequest): AsyncGenerator<StreamChatEvent> {
    const chunks = ['这是', '本地 Mock ', '模型返回的', '流式响应。'];

    for (const chunk of chunks) {
      if (request.signal?.aborted) {
        throw new DOMException('The operation was aborted.', 'AbortError');
      }

      await new Promise((resolve) => setTimeout(resolve, 40));
      yield { content: chunk, type: 'delta' };
    }

    yield { type: 'done' };
  }

  private parsePayload(data: string): OpenAiStreamPayload {
    try {
      return JSON.parse(data) as OpenAiStreamPayload;
    } catch {
      throw new ServiceUnavailableException({
        code: 'LLM_INVALID_STREAM',
        message: 'LLM provider returned an invalid stream payload',
      });
    }
  }

  private providerErrorCode(status: number): string {
    if (status === 401 || status === 403) {
      return 'LLM_AUTH_ERROR';
    }

    if (status === 429) {
      return 'LLM_RATE_LIMITED';
    }

    if (status >= 500) {
      return 'LLM_UNAVAILABLE';
    }

    return 'LLM_REQUEST_ERROR';
  }

  private resolveCredentials(request: StreamChatRequest): {
    apiKey?: string;
    apiKeyName: string;
    baseUrl: string;
  } {
    const source =
      PROVIDER_CREDENTIAL_SOURCES[request.providerCode ?? ''] ?? DEFAULT_CREDENTIAL_SOURCE;
    const apiKeyName = request.providerKeyRef?.trim() || source.apiKeyName;
    const apiKey = this.configService.get<string>(apiKeyName)?.trim() || undefined;
    const configuredBaseUrl =
      request.providerBaseUrl?.trim() ||
      this.configService.get<string>(source.baseUrlName)?.trim() ||
      this.configService.get<string>('LLM_BASE_URL');

    if (!configuredBaseUrl) {
      throw new ServiceUnavailableException({
        code: 'LLM_NOT_CONFIGURED',
        message: `${request.providerBaseUrl ? 'provider base URL' : source.baseUrlName} is not configured`,
      });
    }

    return {
      apiKey,
      apiKeyName,
      baseUrl: configuredBaseUrl,
    };
  }
}
