import { ConfigService } from '@nestjs/config';
import { describe, expect, it } from 'vitest';
import { MockVideoProvider } from './mock-video.provider';

describe('MockVideoProvider', () => {
  it('creates an asynchronous mock task and returns an animated SVG result', async () => {
    const provider = new MockVideoProvider(
      new ConfigService({
        VIDEO_MOCK_DURATION_MS: 0,
      }),
    );
    const created = await provider.createGeneration({
      parameters: {
        duration: 5,
        ratio: '16:9',
      },
      prompt: '极光穿过冰湖',
    });
    const completed = await provider.pollGeneration(created.requestId);

    expect(created.status).toBe('PROCESSING');
    expect(completed).toMatchObject({
      progress: 100,
      status: 'SUCCEEDED',
    });
    expect(completed.result).toMatchObject({
      extension: 'svg',
      mimeType: 'image/svg+xml',
    });
    expect(completed.result?.buffer.toString('utf8')).toContain('<animate');
    expect(completed.result?.buffer.toString('utf8')).toContain('极光穿过冰湖');
  });
});
