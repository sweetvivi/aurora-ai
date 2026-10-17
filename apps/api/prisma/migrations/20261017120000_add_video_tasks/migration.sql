-- CreateEnum
CREATE TYPE "VideoTaskStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "video_tasks" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sourceFileId" TEXT,
    "lastFrameFileId" TEXT,
    "resultFileId" TEXT,
    "modelAlias" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "parameters" JSONB,
    "status" "VideoTaskStatus" NOT NULL DEFAULT 'QUEUED',
    "providerRequestId" TEXT,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "idempotencyKey" TEXT NOT NULL,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "video_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "video_tasks_idempotencyKey_key" ON "video_tasks"("idempotencyKey");

-- CreateIndex
CREATE INDEX "video_tasks_userId_createdAt_idx" ON "video_tasks"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "video_tasks_status_createdAt_idx" ON "video_tasks"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "video_tasks" ADD CONSTRAINT "video_tasks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_tasks" ADD CONSTRAINT "video_tasks_sourceFileId_fkey" FOREIGN KEY ("sourceFileId") REFERENCES "file_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_tasks" ADD CONSTRAINT "video_tasks_lastFrameFileId_fkey" FOREIGN KEY ("lastFrameFileId") REFERENCES "file_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_tasks" ADD CONSTRAINT "video_tasks_resultFileId_fkey" FOREIGN KEY ("resultFileId") REFERENCES "file_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
