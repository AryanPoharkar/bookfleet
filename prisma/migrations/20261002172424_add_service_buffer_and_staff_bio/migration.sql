-- AlterTable
ALTER TABLE "Service" ADD COLUMN     "bufferMinutes" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Staff" ADD COLUMN     "bio" TEXT;
