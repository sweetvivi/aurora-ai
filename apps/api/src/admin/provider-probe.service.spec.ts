import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProviderProbeService } from './provider-probe.service';

describe('ProviderProbeService', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('discovers compatible models without reflecting the transient key', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: [
            { id: 'chat-model-v2', owned_by: 'example' },
            { id: 'seedream-5', display_name: 'Seedream 5' },
            { id: 'grok-imagine-video' },
            { id: 'text-embedding-v4' },
          ],
        }),
        {
          headers: {
            'content-type': 'application/json',
          },
          status: 200,
        },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);
    const service = new ProviderProbeService(new ConfigService({}));
    const result = await service.probe({
      apiKey: 'sk-probe-secret',
      baseUrl: 'https://provider.example/v1/',
      protocol: 'openai-compatible',
      providerCode: 'example',
      timeoutMs: 3_000,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://provider.example/v1/models',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer sk-probe-secret',
        }),
      }),
    );
    expect(result).toMatchObject({
      modelCount: 4,
      protocol: 'openai-compatible',
      truncated: false,
    });
    expect(result.models).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          capabilities: ['chat'],
          providerModel: 'chat-model-v2',
          suggestedAlias: 'example-chat-model-v2',
        }),
        expect.objectContaining({
          capabilities: ['image'],
          providerModel: 'seedream-5',
        }),
        expect.objectContaining({
          capabilities: ['video'],
          providerModel: 'grok-imagine-video',
        }),
        expect.objectContaining({
          capabilities: ['embedding'],
          providerModel: 'text-embedding-v4',
        }),
      ]),
    );
    expect(JSON.stringify(result)).not.toContain('sk-probe-secret');
  });

  it('requires either a transient key or a configured key reference', async () => {
    const service = new ProviderProbeService(new ConfigService({}));

    await expect(
      service.probe({
        baseUrl: 'https://provider.example/v1',
        keyRef: 'MISSING_PROVIDER_KEY',
        protocol: 'openai-compatible',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('maps rejected credentials to a safe provider error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: 'secret upstream detail' }), {
          status: 401,
        }),
      ),
    );
    const service = new ProviderProbeService(new ConfigService({}));

    await expect(
      service.probe({
        apiKey: 'sk-invalid',
        baseUrl: 'https://provider.example/v1',
        protocol: 'openai-compatible',
      }),
    ).rejects.toMatchObject({
      response: {
        code: 'PROVIDER_AUTH_FAILED',
      },
    });
  });
});
