-- Add soft-delete support to events (additive only).

-- AlterTable
ALTER TABLE "events" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "events_deletedAt_idx" ON "events"("deletedAt");
