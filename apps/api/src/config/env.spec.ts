import { describe, expect, it } from 'vitest';
import { envSchema } from './env';

describe('environment schema', () => {
  it('provides safe local development defaults', () => {
    const environment = envSchema.parse({});

    expect(environment.API_HOST).toBe('127.0.0.1');
    expect(environment.API_PORT).toBe(3001);
    expect(environment.IMAGE_PROVIDER).toBe('auto');
    expect(environment.IMAGE_DEFAULT_MODEL).toBe('gpt-image-2.5');
    expect(environment.IMAGE_DEFAULT_MODEL_ALIAS).toBe('jiguang-gpt-image-2.5');
    expect(environment.IMAGE_SEEDREAM_DEFAULT_MODEL).toBe('doubao-seedream-4-0-250828');
    expect(environment.LLM_DEFAULT_MODEL).toBe('openai-gpt-6-astra');
    expect(environment.LLM_DEEPSEEK_BASE_URL).toBe('https://api.example.com/v1');
    expect(environment.LLM_QWEN_BASE_URL).toBe('https://api.example.com/v1');
    expect(environment.VIDEO_PROVIDER).toBe('auto');
    expect(environment.VIDEO_DEFAULT_MODEL).toBe('grok-imagine-video');
    expect(environment.VIDEO_DEFAULT_MODEL_ALIAS).toBe('xai-grok-imagine-video');
    expect(environment.VIDEO_SEEDANCE_DEFAULT_MODEL).toBe('doubao-seedance-1-0-pro-250528');
  });

  it('coerces boolean environment values', () => {
    const environment = envSchema.parse({
      DATABASE_CONNECT_ON_BOOT: 'false',
      REDIS_CONNECT_ON_BOOT: 'true',
    });

    expect(environment.DATABASE_CONNECT_ON_BOOT).toBe(false);
    expect(environment.REDIS_CONNECT_ON_BOOT).toBe(true);
  });

  it('treats an empty model key as not configured', () => {
    const environment = envSchema.parse({
      LLM_API_KEY: '',
      LLM_DEEPSEEK_API_KEY: '',
      LLM_QWEN_API_KEY: '',
      IMAGE_SEEDREAM_API_KEY: '',
      VIDEO_SEEDANCE_API_KEY: '',
    });

    expect(environment.LLM_API_KEY).toBeUndefined();
    expect(environment.LLM_DEEPSEEK_API_KEY).toBeUndefined();
    expect(environment.LLM_QWEN_API_KEY).toBeUndefined();
    expect(environment.IMAGE_SEEDREAM_API_KEY).toBeUndefined();
    expect(environment.VIDEO_SEEDANCE_API_KEY).toBeUndefined();
  });
});
