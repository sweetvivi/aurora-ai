import { ConfigService } from '@nestjs/config';
import { describe, expect, it } from 'vitest';
import { MockImageProvider } from './mock-image.provider';

describe('MockImageProvider', () => {
  it('generates a deterministic PNG image', async () => {
    const provider = new MockImageProvider(
      new ConfigService({
        IMAGE_MOCK_IMAGE_SIZE: 64,
      }),
    );
    const first = await provider.generateImage({ prompt: '极光测试图' });
    const second = await provider.generateImage({ prompt: '极光测试图' });

    expect(first).toMatchObject({
      extension: 'png',
      mimeType: 'image/png',
    });
    expect(first.buffer.subarray(0, 8)).toEqual(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    );
    expect(first.buffer.subarray(16, 24)).toEqual(second.buffer.subarray(16, 24));
    expect(first.buffer.readUInt32BE(16)).toBe(64);
    expect(first.buffer.readUInt32BE(20)).toBe(64);
  });
});
