import { ConfigService } from '@nestjs/config';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { OpenAiCompatibleProvider } from './openai-compatible.provider';

function createStreamResponse(): Response {
  return createSseResponse([
    'data: {"choices":[{"delta":{"content":"ok"}}]}\n\n',
    'data: [DONE]\n\n',
  ]);
}

function createSseResponse(chunks: string[]): Response {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
      }

      controller.close();
    },
  });

  return new Response(body, {
    headers: { 'content-type': 'text/event-stream' },
    status: 200,
  });
}

async function collectEvents(
  provider: OpenAiCompatibleProvider,
  providerCode: string,
  overrides: {
    providerBaseUrl?: string;
    providerKeyRef?: string;
  } = {},
) {
  const events = [];

  for await (const event of provider.streamChat({
    messages: [{ content: 'hello', role: 'user' }],
    model: 'provider-model',
    providerCode,
    ...overrides,
  })) {
    events.push(event);
  }

  return events;
}

describe('OpenAI compatible chat provider', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('uses the DeepSeek key and base URL for DeepSeek models', async () => {
    const fetchMock = vi.fn().mockResolvedValue(createStreamResponse());
    vi.stubGlobal('fetch', fetchMock);
    const provider = new OpenAiCompatibleProvider(
      new ConfigService({
        LLM_API_KEY: 'default-key',
        LLM_BASE_URL: 'https://default.example/v1',
        LLM_DEEPSEEK_API_KEY: 'deepseek-key',
        LLM_DEEPSEEK_BASE_URL: 'https://deepseek.example/v1',
      }),
    );

    const events = await collectEvents(provider, 'deepseek');

    expect(events).toEqual([{ content: 'ok', type: 'delta' }, { type: 'done' }]);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://deepseek.example/v1/chat/completions',
      expect.objectContaining({
        headers: expect.objectContaining({
          authorization: 'Bearer deepseek-key',
        }),
      }),
    );
  });

  it('uses the Qwen key group without crossing into the default credential group', async () => {
    const fetchMock = vi.fn().mockResolvedValue(createStreamResponse());
    vi.stubGlobal('fetch', fetchMock);
    const provider = new OpenAiCompatibleProvider(
      new ConfigService({
        LLM_API_KEY: 'default-key',
        LLM_BASE_URL: 'https://default.example/v1',
        LLM_QWEN_API_KEY: 'qwen-key',
        LLM_QWEN_BASE_URL: 'https://qwen.example/v1',
      }),
    );

    await collectEvents(provider, 'qwen');
    await expect(collectEvents(provider, 'deepseek')).rejects.toMatchObject({
      response: {
        code: 'LLM_NOT_CONFIGURED',
        message: 'LLM_DEEPSEEK_API_KEY is not configured',
      },
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://qwen.example/v1/chat/completions',
      expect.objectContaining({
        headers: expect.objectContaining({
          authorization: 'Bearer qwen-key',
        }),
      }),
    );
  });

  it('does not require a default key for a configured provider group', async () => {
    const fetchMock = vi.fn().mockResolvedValue(createStreamResponse());
    vi.stubGlobal('fetch', fetchMock);
    const provider = new OpenAiCompatibleProvider(
      new ConfigService({
        LLM_DEEPSEEK_API_KEY: 'deepseek-key',
        LLM_DEEPSEEK_BASE_URL: 'https://deepseek.example/v1',
      }),
    );

    await collectEvents(provider, 'deepseek');

    expect(fetchMock).toHaveBeenCalledWith(
      'https://deepseek.example/v1/chat/completions',
      expect.objectContaining({
        headers: expect.objectContaining({
          authorization: 'Bearer deepseek-key',
        }),
      }),
    );
  });

  it('uses database-provided base URL and key reference when supplied by the model registry', async () => {
    const fetchMock = vi.fn().mockResolvedValue(createStreamResponse());
    vi.stubGlobal('fetch', fetchMock);
    const provider = new OpenAiCompatibleProvider(
      new ConfigService({
        CUSTOM_CHAT_API_KEY: 'custom-key',
        LLM_API_KEY: 'default-key',
        LLM_BASE_URL: 'https://default.example/v1',
      }),
    );

    await collectEvents(provider, 'custom-provider', {
      providerBaseUrl: 'https://custom.example/v1/',
      providerKeyRef: 'CUSTOM_CHAT_API_KEY',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://custom.example/v1/chat/completions',
      expect.objectContaining({
        headers: expect.objectContaining({
          authorization: 'Bearer custom-key',
        }),
      }),
    );
  });

  it('ignores reasoning deltas while forwarding the final answer', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        createSseResponse([
          'data: {"choices":[{"delta":{"reasoning_content":"内部推理"}}]}\n\n',
          'data: {"choices":[{"delta":{"content":"最终答案"}}]}\n\n',
          'data: [DONE]\n\n',
        ]),
      );
    vi.stubGlobal('fetch', fetchMock);
    const provider = new OpenAiCompatibleProvider(
      new ConfigService({
        LLM_API_KEY: 'default-key',
        LLM_BASE_URL: 'https://default.example/v1',
      }),
    );

    await expect(collectEvents(provider, 'jiguang')).resolves.toEqual([
      { content: '最终答案', type: 'delta' },
      { type: 'done' },
    ]);
  });

  it('reports a distinct empty response when the provider only returns reasoning', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        createSseResponse([
          'data: {"choices":[{"delta":{"reasoning_content":"只有内部推理"}}]}\n\n',
          'data: [DONE]\n\n',
        ]),
      );
    vi.stubGlobal('fetch', fetchMock);
    const provider = new OpenAiCompatibleProvider(
      new ConfigService({
        LLM_API_KEY: 'default-key',
        LLM_BASE_URL: 'https://default.example/v1',
      }),
    );

    await expect(collectEvents(provider, 'jiguang')).rejects.toMatchObject({
      response: {
        code: 'LLM_EMPTY_RESPONSE',
        message: 'LLM provider returned reasoning content without a final answer',
      },
    });
  });
});
