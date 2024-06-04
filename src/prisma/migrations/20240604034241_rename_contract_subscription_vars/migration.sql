/*
  Warnings:

  - You are about to drop the column `filterEventLogs` on the `contract_subscriptions` table. All the data in the column will be lost.
  - You are about to drop the column `parseEventLogs` on the `contract_subscriptions` table. All the data in the column will be lost.
  - You are about to drop the column `parseTransactionReceipts` on the `contract_subscriptions` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "contract_subscriptions" DROP COLUMN "filterEventLogs",
DROP COLUMN "parseEventLogs",
DROP COLUMN "parseTransactionReceipts",
ADD COLUMN     "filterEvents" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "processEventLogs" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "processTransactionReceipts" BOOLEAN NOT NULL DEFAULT true;
