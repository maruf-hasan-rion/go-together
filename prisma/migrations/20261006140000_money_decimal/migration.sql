-- Money columns: Float -> DECIMAL(10,2) for exact decimal storage.

-- AlterTable
ALTER TABLE "events" ALTER COLUMN "joiningFee" SET DATA TYPE DECIMAL(10,2);

-- AlterTable
ALTER TABLE "bookings" ALTER COLUMN "totalAmount" SET DATA TYPE DECIMAL(10,2);

-- AlterTable
ALTER TABLE "payments" ALTER COLUMN "amount" SET DATA TYPE DECIMAL(10,2);
