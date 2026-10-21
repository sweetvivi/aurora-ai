-- AlterTable
ALTER TABLE "custom_agents" ADD COLUMN     "inputMode" TEXT NOT NULL DEFAULT 'chat',
ADD COLUMN     "maxTokens" INTEGER,
ADD COLUMN     "modelAlias" TEXT,
ADD COLUMN     "temperature" DOUBLE PRECISION;
