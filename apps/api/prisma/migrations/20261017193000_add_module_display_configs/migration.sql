-- CreateTable
CREATE TABLE "module_display_configs" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "cover" TEXT,
    "group" TEXT NOT NULL DEFAULT 'primary',
    "badge" TEXT,
    "route" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 100,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "module_display_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "module_display_configs_key_key" ON "module_display_configs"("key");

-- CreateIndex
CREATE INDEX "module_display_configs_group_sortOrder_idx" ON "module_display_configs"("group", "sortOrder");
