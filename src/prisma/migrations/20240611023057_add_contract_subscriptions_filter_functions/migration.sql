-- AlterTable
ALTER TABLE "contract_subscriptions" ADD COLUMN     "filterFunctions" TEXT[] DEFAULT ARRAY[]::TEXT[];
