-- AlterTable
ALTER TABLE "contract_subscriptions" ADD COLUMN     "filterEventLogs" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "parseEventLogs" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "parseTransactionReceipts" BOOLEAN NOT NULL DEFAULT true;
