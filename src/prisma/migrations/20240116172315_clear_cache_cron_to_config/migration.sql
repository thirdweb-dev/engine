-- AlterTable
ALTER TABLE "configuration" ADD COLUMN     "clearCacheCronSchedule" TEXT NOT NULL DEFAULT '*/30 * * * * *';
