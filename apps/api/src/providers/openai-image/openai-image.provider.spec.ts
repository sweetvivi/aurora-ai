import { ConfigService } from '@nestjs/config';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { OpenAiImageProvider } from './openai-image.provider';

const ONE_PIXEL_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2nY4AAAAASUVORK5CYII=';

describe('OpenAiImageProvider', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('uses the generations endpoint and decodes a base64 image', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: [{ b64_json: ONE_PIXEL_PNG_BASE64 }] }), {
        headers: { 'content-type': 'application/json' },
        status: 200,
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const provider = createProvider();
    const result = await provider.generateImage({
      model: 'gpt-image-2.5',
      parameters: { ratio: '1:1', size: '1K' },
      prompt: '极光测试图',
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0]?.[0]).toBe('https://example.test/v1/images/generations');
    expect(result).toMatchObject({ extension: 'png', mimeType: 'image/png' });
    expect(result.buffer.subarray(0, 8)).toEqual(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    );
  });

  it('uses the edits endpoint for a source image', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: [{ b64_json: ONE_PIXEL_PNG_BASE64 }] }), {
        headers: { 'content-type': 'application/json' },
        status: 200,
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const provider = createProvider();
    await provider.generateImage({
      model: 'gpt-image-2.5',
      parameters: { ratio: '16:9', size: '2K' },
      prompt: '替换背景',
      sourceImages: [
        {
          buffer: Buffer.from(ONE_PIXEL_PNG_BASE64, 'base64'),
          mimeType: 'image/png',
          originalName: 'source.png',
        },
      ],
    });

    expect(fetchMock.mock.calls[0]?.[0]).toBe('https://example.test/v1/images/edits');
    const form = fetchMock.mock.calls[0]?.[1]?.body;

    expect(form).toBeInstanceOf(FormData);
    expect((form as FormData).getAll('image')).toHaveLength(1);
  });

  it('sends multiple reference images with the official image[] field', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: [{ b64_json: ONE_PIXEL_PNG_BASE64 }] }), {
        headers: { 'content-type': 'application/json' },
        status: 200,
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const provider = createProvider();
    await provider.generateImage({
      model: 'gpt-image-2.5',
      prompt: '将商品融合到背景',
      sourceImages: [
        {
          buffer: Buffer.from(ONE_PIXEL_PNG_BASE64, 'base64'),
          mimeType: 'image/png',
          originalName: 'product.png',
        },
        {
          buffer: Buffer.from(ONE_PIXEL_PNG_BASE64, 'base64'),
          mimeType: 'image/png',
          originalName: 'background.png',
        },
      ],
    });

    const form = fetchMock.mock.calls[0]?.[1]?.body as FormData;

    expect(form).toBeInstanceOf(FormData);
    expect(form.getAll('image[]')).toHaveLength(2);
  });

  it('downloads a URL result when the provider does not return base64', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: [{ url: 'https://cdn.example.test/result.png' }] }), {
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
    const result = await provider.generateImage({ prompt: '下载结果' });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.mimeType).toBe('image/png');
  });
});

function createProvider(): OpenAiImageProvider {
  return new OpenAiImageProvider(
    new ConfigService({
      IMAGE_ACTOR_AUTHORIZATION: 'local-image-extension',
      IMAGE_API_KEY: 'test-image-key',
      IMAGE_BASE_URL: 'https://example.test/v1',
      IMAGE_DEFAULT_MODEL: 'gpt-image-2.5',
      IMAGE_REQUEST_TIMEOUT_MS: 10_000,
    }),
  );
}
