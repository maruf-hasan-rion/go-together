/*
Warnings:

- Changed the column `type` on the `events` table from a scalar field to a list field. If there are non-null values in that column, this step will fail.

*/
-- AlterTable
ALTER TABLE "events"
ALTER COLUMN "type"
SET DATA TYPE "EventType" [] USING ARRAY["type"]::"EventType" [];