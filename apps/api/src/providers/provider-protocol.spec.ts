import { describe, expect, it } from 'vitest';
import {
  buildArkApiUrl,
  resolveImageProviderProtocol,
  resolveVideoProviderProtocol,
} from './provider-protocol';

describe('provider protocol routing', () => {
  it('recognizes Seedream and Seedance provider metadata', () => {
    expect(
      resolveImageProviderProtocol({
        providerCode: 'volcengine',
      }),
    ).toBe('seedream');
    expect(
      resolveImageProviderProtocol({
        model: 'doubao-seedream-4-0-250828',
      }),
    ).toBe('seedream');
    expect(
      resolveVideoProviderProtocol({
        providerBaseUrl: 'https://gateway.example/doubao',
      }),
    ).toBe('seedance');
    expect(
      resolveVideoProviderProtocol({
        model: 'xai-grok-imagine-video',
        providerCode: 'xai',
      }),
    ).toBe('xai');
  });

  it('routes Grok image models to the x.ai image protocol', () => {
    expect(
      resolveImageProviderProtocol({
        model: 'grok-imagine-image',
        providerCode: 'xai',
      }),
    ).toBe('xai');
    expect(
      resolveImageProviderProtocol({
        model: 'xai-grok-imagine-image-2.0',
      }),
    ).toBe('xai');
    expect(
      resolveImageProviderProtocol({
        model: 'gpt-image-2.5',
        providerCode: 'jiguang',
      }),
    ).toBe('openai');
  });

  it('builds Ark URLs without duplicating or dropping the API version', () => {
    expect(buildArkApiUrl('https://ark.example/api/v3/', '/images/generations')).toBe(
      'https://ark.example/api/v3/images/generations',
    );
    expect(buildArkApiUrl('https://gateway.example/doubao', 'contents/generations/tasks')).toBe(
      'https://gateway.example/doubao/api/v3/contents/generations/tasks',
    );
    expect(buildArkApiUrl('https://gateway.example/v1', '/images/generations')).toBe(
      'https://gateway.example/api/v3/images/generations',
    );
  });
});
