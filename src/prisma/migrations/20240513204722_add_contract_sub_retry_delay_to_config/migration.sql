-- AlterTable
ALTER TABLE "configuration" ADD COLUMN     "contractSubscriptionsRetryDelaySeconds" TEXT NOT NULL DEFAULT '10';
