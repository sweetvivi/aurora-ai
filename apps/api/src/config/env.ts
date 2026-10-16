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
  LLM_DEFAULT_MODEL: z.string().min(1).default('openai-gpt-6-astra'),
  LLM_MOCK_MODE: booleanFromEnvironment.default(false),
  LLM_REQUEST_TIMEOUT_MS: z.coerce.number().int().min(1_000).max(600_000).default(120_000),
  STORAGE_ROOT: z.string().min(1).default('../../storage'),
  FILE_MAX_SIZE_BYTES: z.coerce
    .number()
    .int()
    .min(1_024)
    .default(10 * 1024 * 1024),
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
