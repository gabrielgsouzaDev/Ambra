-- CreateEnum
CREATE TYPE "CardStatus" AS ENUM ('ACTIVE', 'BLOCKED');

-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "cardStatus" "CardStatus" NOT NULL DEFAULT 'ACTIVE';
