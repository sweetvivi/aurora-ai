CREATE TYPE "CustomAgentStatus" AS ENUM ('DRAFT', 'PUBLISHED');

CREATE TABLE "custom_agents" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "CustomAgentStatus" NOT NULL DEFAULT 'DRAFT',
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "instructions" TEXT NOT NULL DEFAULT '',
    "opening" TEXT NOT NULL DEFAULT '',
    "category" TEXT NOT NULL DEFAULT '我的智能体',
    "capabilities" TEXT[],
    "tags" TEXT[],
    "starterPrompts" TEXT[],
    "color" TEXT NOT NULL DEFAULT '#3979ed',
    "glyph" TEXT NOT NULL,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "usage" INTEGER NOT NULL DEFAULT 0,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "custom_agents_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "custom_agents_userId_status_updatedAt_idx"
ON "custom_agents"("userId", "status", "updatedAt");

ALTER TABLE "custom_agents"
ADD CONSTRAINT "custom_agents_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
