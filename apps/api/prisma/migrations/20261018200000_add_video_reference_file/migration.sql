ALTER TABLE "video_tasks"
ADD COLUMN "referenceVideoFileId" TEXT;

CREATE INDEX "video_tasks_referenceVideoFileId_idx"
ON "video_tasks"("referenceVideoFileId");

ALTER TABLE "video_tasks"
ADD CONSTRAINT "video_tasks_referenceVideoFileId_fkey"
FOREIGN KEY ("referenceVideoFileId") REFERENCES "file_assets"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
