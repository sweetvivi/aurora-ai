import { ConfigService } from '@nestjs/config';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SeedanceVideoProvider } from './seedance-video.provider';

describe('SeedanceVideoProvider', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('creates and polls an Ark video task with first and last frames', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: 'task-seedance-1' }), {
          headers: { 'content-type': 'application/json' },
          status: 200,
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            content: { video_url: 'https://cdn.example/result.mp4' },
            progress: 100,
            status: 'succeeded',
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
    const image = {
      buffer: Buffer.from('image-data'),
      mimeType: 'image/png',
      originalName: 'frame.png',
    };
    const created = await provider.createGeneration({
      lastFrameImage: image,
      model: 'doubao-seedance-1-0-pro-250528',
      parameters: {
        duration: 5,
        ratio: '16:9',
        resolution: '720p',
      },
      prompt: '镜头缓慢推进',
      providerBaseUrl: 'https://gateway.example/doubao',
      providerKeyRef: 'CUSTOM_SEEDANCE_KEY',
      sourceImage: image,
    });

    expect(created).toMatchObject({
      progress: 1,
      requestId: 'task-seedance-1',
      status: 'PROCESSING',
    });
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      'https://gateway.example/doubao/api/v3/contents/generations/tasks',
    );
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toMatchObject({
      content: [
        { image_url: { url: 'data:image/png;base64,aW1hZ2UtZGF0YQ==' }, type: 'image_url' },
        { image_url: { url: 'data:image/png;base64,aW1hZ2UtZGF0YQ==' }, type: 'image_url' },
        { text: '镜头缓慢推进', type: 'text' },
      ],
      duration: 5,
      model: 'doubao-seedance-1-0-pro-250528',
      ratio: '16:9',
      resolution: '720p',
    });

    await expect(
      provider.pollGeneration('task-seedance-1', {
        model: 'doubao-seedance-1-0-pro-250528',
        providerBaseUrl: 'https://gateway.example/doubao',
        providerKeyRef: 'CUSTOM_SEEDANCE_KEY',
      }),
    ).resolves.toMatchObject({
      progress: 100,
      requestId: 'task-seedance-1',
      status: 'SUCCEEDED',
    });
    expect(fetchMock.mock.calls[1]?.[0]).toBe(
      'https://gateway.example/doubao/api/v3/contents/generations/tasks/task-seedance-1',
    );
  });

  it('maps terminal provider failures to a failed snapshot', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: 'task-failed' }), {
          headers: { 'content-type': 'application/json' },
          status: 200,
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            error: { code: 'invalid_argument', message: '内容不符合要求' },
            progress: 100,
            status: 'failed',
          }),
          {
            headers: { 'content-type': 'application/json' },
            status: 200,
          },
        ),
      );
    vi.stubGlobal('fetch', fetchMock);

    const provider = createProvider();

    await provider.createGeneration({
      prompt: '测试失败状态',
      providerBaseUrl: 'https://ark.example/api/v3',
    });

    await expect(
      provider.pollGeneration('task-failed', {
        providerBaseUrl: 'https://ark.example/api/v3',
      }),
    ).resolves.toMatchObject({
      errorCode: 'VIDEO_REQUEST_ERROR',
      errorMessage: '内容不符合要求',
      status: 'FAILED',
    });
  });
});

function createProvider(): SeedanceVideoProvider {
  return new SeedanceVideoProvider(
    new ConfigService({
      CUSTOM_SEEDANCE_KEY: 'custom-seedance-key',
      VIDEO_API_KEY: 'generic-video-key',
      VIDEO_BASE_URL: 'https://ark.example/api/v3',
      VIDEO_REQUEST_TIMEOUT_MS: 10_000,
      VIDEO_SEEDANCE_API_KEY: 'seedance-key',
      VIDEO_SEEDANCE_DEFAULT_MODEL: 'doubao-seedance-1-0-pro-250528',
    }),
  );
}
