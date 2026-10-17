import { ConfigService } from '@nestjs/config';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { XaiVideoProvider } from './xai-video.provider';

describe('XaiVideoProvider', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('uses database-provided endpoint and key reference for generation and polling', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ request_id: 'custom-request' }), {
          headers: { 'content-type': 'application/json' },
          status: 200,
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            progress: 100,
            status: 'done',
            video: { url: 'https://cdn.example.test/result.mp4' },
          }),
          {
            headers: { 'content-type': 'application/json' },
            status: 200,
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(Buffer.from('0000ftypisom', 'ascii'), {
          headers: { 'content-type': 'video/mp4' },
          status: 200,
        }),
      );
    vi.stubGlobal('fetch', fetchMock);
    const provider = createProvider();

    await expect(
      provider.createGeneration({
        model: 'custom-video-model',
        prompt: '海边日落',
        providerBaseUrl: 'https://custom-video.example/v1/',
        providerKeyRef: 'CUSTOM_VIDEO_API_KEY',
      }),
    ).resolves.toMatchObject({
      requestId: 'custom-request',
      status: 'PROCESSING',
    });

    await expect(
      provider.pollGeneration('custom-request', {
        providerBaseUrl: 'https://custom-video.example/v1/',
        providerKeyRef: 'CUSTOM_VIDEO_API_KEY',
      }),
    ).resolves.toMatchObject({
      progress: 100,
      status: 'SUCCEEDED',
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'https://custom-video.example/v1/videos/generations',
      expect.objectContaining({
        headers: expect.objectContaining({
          authorization: 'Bearer custom-video-key',
        }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://custom-video.example/v1/videos/custom-request',
      expect.objectContaining({
        headers: expect.objectContaining({
          authorization: 'Bearer custom-video-key',
        }),
      }),
    );
  });
});

function createProvider(): XaiVideoProvider {
  return new XaiVideoProvider(
    new ConfigService({
      CUSTOM_VIDEO_API_KEY: 'custom-video-key',
      VIDEO_API_KEY: 'default-video-key',
      VIDEO_BASE_URL: 'https://default-video.example/v1',
      VIDEO_REQUEST_TIMEOUT_MS: 10_000,
    }),
  );
}
