import { ConfigService } from '@nestjs/config';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SeedreamImageProvider } from './seedream-image.provider';

const ONE_PIXEL_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2nY4AAAAASUVORK5CYII=';

describe('SeedreamImageProvider', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('submits a synchronous Ark image request and decodes the result', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: [{ b64_json: ONE_PIXEL_PNG_BASE64 }] }), {
        headers: { 'content-type': 'application/json' },
        status: 200,
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const provider = createProvider();
    const result = await provider.generateImage({
      model: 'doubao-seedream-4-0-250828',
      parameters: {
        ratio: '16:9',
        size: '2K',
        watermark: false,
      },
      prompt: '在清晨的湖边生成一座未来建筑',
      providerBaseUrl: 'https://gateway.example/doubao',
      providerKeyRef: 'CUSTOM_SEEDREAM_KEY',
      sourceImages: [
        {
          buffer: Buffer.from(ONE_PIXEL_PNG_BASE64, 'base64'),
          mimeType: 'image/png',
          originalName: 'reference.png',
        },
      ],
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      'https://gateway.example/doubao/api/v3/images/generations',
    );
    expect(fetchMock.mock.calls[0]?.[1]?.headers).toMatchObject({
      authorization: 'Bearer custom-seedream-key',
    });
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toMatchObject({
      image: [`data:image/png;base64,${ONE_PIXEL_PNG_BASE64}`],
      model: 'doubao-seedream-4-0-250828',
      prompt: '在清晨的湖边生成一座未来建筑',
      response_format: 'url',
      size: '2K',
      watermark: false,
    });
    expect(result).toMatchObject({ extension: 'png', mimeType: 'image/png' });
  });

  it('downloads URL results and reports an unconfigured provider', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: [{ url: 'https://cdn.example/result.png' }] }), {
          headers: { 'content-type': 'application/json' },
          status: 200,
        }),
      )
      .mockResolvedValueOnce(
        new Response(Buffer.from(ONE_PIXEL_PNG_BASE64, 'base64'), {
          headers: { 'content-type': 'image/png' },
          status: 200,
        }),
      );
    vi.stubGlobal('fetch', fetchMock);

    const provider = createProvider();

    await expect(
      provider.generateImage({
        prompt: '下载异步图片结果',
        providerBaseUrl: 'https://ark.example/api/v3',
      }),
    ).resolves.toMatchObject({ extension: 'png', mimeType: 'image/png' });
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const unconfigured = new SeedreamImageProvider(
      new ConfigService({
        IMAGE_BASE_URL: 'https://ark.example/api/v3',
        IMAGE_REQUEST_TIMEOUT_MS: 10_000,
      }),
    );

    await expect(unconfigured.generateImage({ prompt: '没有 Key' })).rejects.toMatchObject({
      status: 503,
    });
  });
});

function createProvider(): SeedreamImageProvider {
  return new SeedreamImageProvider(
    new ConfigService({
      CUSTOM_SEEDREAM_KEY: 'custom-seedream-key',
      IMAGE_API_KEY: 'generic-image-key',
      IMAGE_BASE_URL: 'https://ark.example/api/v3',
      IMAGE_REQUEST_TIMEOUT_MS: 10_000,
      IMAGE_SEEDREAM_API_KEY: 'seedream-key',
      IMAGE_SEEDREAM_DEFAULT_MODEL: 'doubao-seedream-4-0-250828',
    }),
  );
}
