-- AlterTable
ALTER TABLE "configuration" ADD COLUMN     "ipAllowlist" TEXT[] DEFAULT ARRAY[]::TEXT[];
