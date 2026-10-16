-- CreateEnum
CREATE TYPE "ProviderKind" AS ENUM ('OPENAI_COMPATIBLE');

-- CreateEnum
CREATE TYPE "ModelCapability" AS ENUM ('CHAT', 'IMAGE', 'VIDEO', 'EMBEDDING');

-- CreateTable
CREATE TABLE "provider_configs" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "kind" "ProviderKind" NOT NULL DEFAULT 'OPENAI_COMPATIBLE',
    "baseUrl" TEXT NOT NULL,
    "keyRef" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "provider_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "model_configs" (
    "id" TEXT NOT NULL,
    "alias" TEXT NOT NULL,
    "providerModel" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "capabilities" "ModelCapability"[],
    "contextWindow" INTEGER,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "providerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "model_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "provider_configs_code_key" ON "provider_configs"("code");

-- CreateIndex
CREATE UNIQUE INDEX "model_configs_alias_key" ON "model_configs"("alias");

-- CreateIndex
CREATE INDEX "model_configs_providerId_idx" ON "model_configs"("providerId");

-- AddForeignKey
ALTER TABLE "model_configs" ADD CONSTRAINT "model_configs_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "provider_configs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
