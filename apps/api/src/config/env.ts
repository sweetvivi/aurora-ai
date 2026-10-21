import { z } from 'zod';

const booleanFromEnvironment = z.preprocess((value) => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    if (value.toLowerCase() === 'true') {
      return true;
    }

    if (value.toLowerCase() === 'false') {
      return false;
    }
  }

  return value;
}, z.boolean());

const optionalNonEmptyString = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.string().min(1).optional(),
);

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_HOST: z.string().min(1).default('127.0.0.1'),
  API_PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  API_PREFIX: z.string().min(1).default('api/v1'),
  CORS_ORIGINS: z
    .string()
    .default(
      'http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174',
    ),
  DATABASE_URL: z
    .string()
    .min(1)
    .default('postgresql://aurora:aurora@localhost:5432/aurora?schema=public'),
  DATABASE_CONNECT_ON_BOOT: booleanFromEnvironment.default(true),
  REDIS_URL: z.string().min(1).default('redis://localhost:6379'),
  REDIS_CONNECT_ON_BOOT: booleanFromEnvironment.default(true),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  AUTH_TOKEN_SECRET: z.string().min(16).default('aurora-local-development-secret-change-me'),
  AUTH_ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().min(60).max(86_400).default(900),
  AUTH_REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().min(1).max(365).default(30),
  AUTH_DEV_LOGIN_ENABLED: booleanFromEnvironment.default(true),
  INITIAL_POINTS: z.coerce.number().int().min(0).default(100),
  CHAT_POINTS_COST: z.coerce.number().int().min(0).default(1),
  IMAGE_TASK_POINTS_COST: z.coerce.number().int().min(0).default(5),
  LLM_BASE_URL: z.string().url().default('https://api.example.com/v1'),
  LLM_API_KEY: optionalNonEmptyString,
  LLM_DEEPSEEK_BASE_URL: z.string().url().default('https://api.example.com/v1'),
  LLM_DEEPSEEK_API_KEY: optionalNonEmptyString,
  LLM_DEFAULT_MODEL: z.string().min(1).default('openai-gpt-6-astra'),
  LLM_MOCK_MODE: booleanFromEnvironment.default(false),
  LLM_QWEN_BASE_URL: z.string().url().default('https://api.example.com/v1'),
  LLM_QWEN_API_KEY: optionalNonEmptyString,
  LLM_REQUEST_TIMEOUT_MS: z.coerce.number().int().min(1_000).max(600_000).default(120_000),
  STORAGE_ROOT: z.string().min(1).default('../../storage'),
  FILE_MAX_SIZE_BYTES: z.coerce
    .number()
    .int()
    .min(1_024)
    .default(10 * 1024 * 1024),
  VIDEO_FILE_MAX_SIZE_BYTES: z.coerce
    .number()
    .int()
    .min(1_024)
    .default(50 * 1024 * 1024),
  IMAGE_MOCK_DELAY_MS: z.coerce.number().int().min(0).max(60_000).default(1_200),
  IMAGE_MOCK_IMAGE_SIZE: z.coerce.number().int().min(64).max(1_024).default(512),
  IMAGE_PROVIDER: z.enum(['auto', 'mock', 'openai', 'xai']).default('auto'),
  IMAGE_BASE_URL: z.string().url().default('https://api.example.com/v1'),
  IMAGE_API_KEY: optionalNonEmptyString,
  IMAGE_FALLBACK_API_KEY: optionalNonEmptyString,
  IMAGE_SEEDREAM_API_KEY: optionalNonEmptyString,
  IMAGE_GROK_BASE_URL: z.string().url().default('https://api.example.com/v1'),
  IMAGE_GROK_API_KEY: optionalNonEmptyString,
  IMAGE_GROK_DEFAULT_MODEL: z.string().min(1).default('grok-imagine-image'),
  IMAGE_ACTOR_AUTHORIZATION: z.string().min(1).default('local-image-extension'),
  IMAGE_DEFAULT_MODEL: z.string().min(1).default('gpt-image-2.5'),
  IMAGE_DEFAULT_MODEL_ALIAS: z.string().min(1).default('jiguang-gpt-image-2.5'),
  IMAGE_SEEDREAM_DEFAULT_MODEL: z.string().min(1).default('doubao-seedream-4-0-250828'),
  IMAGE_REQUEST_TIMEOUT_MS: z.coerce.number().int().min(1_000).max(600_000).default(180_000),
  VIDEO_TASK_POINTS_COST: z.coerce.number().int().min(0).default(10),
  VIDEO_PROVIDER: z.enum(['auto', 'mock', 'xai']).default('auto'),
  VIDEO_BASE_URL: z.string().url().default('https://api.example.com/v1'),
  VIDEO_API_KEY: optionalNonEmptyString,
  VIDEO_SEEDANCE_API_KEY: optionalNonEmptyString,
  VIDEO_DEFAULT_MODEL: z.string().min(1).default('grok-imagine-video'),
  VIDEO_DEFAULT_MODEL_ALIAS: z.string().min(1).default('xai-grok-imagine-video'),
  VIDEO_SEEDANCE_DEFAULT_MODEL: z.string().min(1).default('doubao-seedance-1-0-pro-250528'),
  VIDEO_REQUEST_TIMEOUT_MS: z.coerce.number().int().min(1_000).max(600_000).default(180_000),
  VIDEO_POLL_INTERVAL_MS: z.coerce.number().int().min(100).max(30_000).default(2_000),
  VIDEO_MAX_POLL_DURATION_MS: z.coerce.number().int().min(10_000).max(3_600_000).default(900_000),
  VIDEO_MOCK_DURATION_MS: z.coerce.number().int().min(0).max(60_000).default(4_000),
  VIDEO_RESULT_MAX_BYTES: z.coerce
    .number()
    .int()
    .min(1_024)
    .default(300 * 1024 * 1024),
});

export type AppEnvironment = z.infer<typeof envSchema>;

export function validateEnvironment(config: Record<string, unknown>): AppEnvironment {
  const result = envSchema.safeParse(config);

  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');

    throw new Error(`Environment validation failed: ${details}`);
  }

  return result.data;
}
