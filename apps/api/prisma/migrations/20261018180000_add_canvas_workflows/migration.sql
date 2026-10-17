CREATE TABLE "canvas_workflows" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '新建画布',
    "document" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "canvas_workflows_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "canvas_workflows_userId_updatedAt_idx"
ON "canvas_workflows"("userId", "updatedAt");

ALTER TABLE "canvas_workflows"
ADD CONSTRAINT "canvas_workflows_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
