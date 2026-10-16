import { describe, expect, it } from 'vitest';
import { envSchema } from './env';

describe('environment schema', () => {
  it('provides safe local development defaults', () => {
    const environment = envSchema.parse({});

    expect(environment.API_HOST).toBe('127.0.0.1');
    expect(environment.API_PORT).toBe(3001);
    expect(environment.LLM_DEFAULT_MODEL).toBe('openai-gpt-6-astra');
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
    });

    expect(environment.LLM_API_KEY).toBeUndefined();
  });
});
