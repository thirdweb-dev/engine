/*
  Warnings:

  - Added the required column `maxBlocksToIndex` to the `configuration` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ContractLogs" ADD COLUMN     "eventName" TEXT,
ALTER COLUMN "decodedLog" DROP NOT NULL;

-- AlterTable
ALTER TABLE "configuration" ADD COLUMN     "indexerListenerCronSchedule" TEXT,
ADD COLUMN     "maxBlocksToIndex" INTEGER NOT NULL;

-- CreateIndex
CREATE INDEX "IndexedContracts_chainId_idx" ON "IndexedContracts"("chainId");
