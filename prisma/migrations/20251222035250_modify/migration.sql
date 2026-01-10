/*
  Warnings:

  - You are about to drop the column `numberOfTickets` on the `bookings` table. All the data in the column will be lost.
  - You are about to drop the column `totalAmount` on the `bookings` table. All the data in the column will be lost.
  - You are about to drop the column `address` on the `events` table. All the data in the column will be lost.
  - You are about to drop the column `city` on the `events` table. All the data in the column will be lost.
  - You are about to drop the column `eventTime` on the `events` table. All the data in the column will be lost.
  - You are about to drop the column `currency` on the `payments` table. All the data in the column will be lost.
  - You are about to drop the column `eventId` on the `payments` table. All the data in the column will be lost.
  - You are about to drop the column `paymentData` on the `payments` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `payments` table. All the data in the column will be lost.
  - You are about to drop the `HostRequest` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[bookingId]` on the table `payments` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `bookingId` to the `payments` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterEnum
ALTER TYPE "PaymentStatus" ADD VALUE 'FREE';

-- DropForeignKey
ALTER TABLE "HostRequest" DROP CONSTRAINT "HostRequest_userId_fkey";

-- DropForeignKey
ALTER TABLE "payments" DROP CONSTRAINT "payments_eventId_fkey";

-- DropForeignKey
ALTER TABLE "payments" DROP CONSTRAINT "payments_userId_fkey";

-- DropIndex
DROP INDEX "events_city_idx";

-- DropIndex
DROP INDEX "payments_eventId_idx";

-- DropIndex
DROP INDEX "payments_userId_idx";

-- DropIndex
DROP INDEX "users_email_idx";

-- AlterTable
ALTER TABLE "bookings" DROP COLUMN "numberOfTickets",
DROP COLUMN "totalAmount";

-- AlterTable
ALTER TABLE "events" DROP COLUMN "address",
DROP COLUMN "city",
DROP COLUMN "eventTime";

-- AlterTable
ALTER TABLE "payments" DROP COLUMN "currency",
DROP COLUMN "eventId",
DROP COLUMN "paymentData",
DROP COLUMN "userId",
ADD COLUMN     "bookingId" TEXT NOT NULL;

-- DropTable
DROP TABLE "HostRequest";

-- DropEnum
DROP TYPE "HostRequestStatus";

-- CreateTable
CREATE TABLE "host_applications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "message" TEXT,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "rejectReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "host_applications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "host_applications_userId_key" ON "host_applications"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "payments_bookingId_key" ON "payments"("bookingId");

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "host_applications" ADD CONSTRAINT "host_applications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
