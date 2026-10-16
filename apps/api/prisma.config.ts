import { defineConfig } from 'prisma/config';

try {
  process.loadEnvFile('../../.env');
} catch {
  // The repository intentionally does not require a local .env file for code generation.
}

const databaseUrl =
  process.env.DATABASE_URL ?? 'postgresql://aurora:aurora@localhost:5432/aurora?schema=public';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: databaseUrl,
  },
});
