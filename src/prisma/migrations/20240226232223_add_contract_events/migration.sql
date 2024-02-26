/*
  Warnings:

  - Added the required column `maxBlocksToIndex` to the `configuration` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "configuration" ADD COLUMN     "indexerListenerCronSchedule" TEXT,
ADD COLUMN     "maxBlocksToIndex" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "contract_subscriptions" (
    "chainId" INTEGER NOT NULL,
    "contractAddress" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contract_subscriptions_pkey" PRIMARY KEY ("chainId","contractAddress")
);

-- CreateTable
CREATE TABLE "contract_events" (
    "chainId" INTEGER NOT NULL,
    "blockNumber" INTEGER NOT NULL,
    "contractAddress" TEXT NOT NULL,
    "transactionHash" TEXT NOT NULL,
    "topic0" TEXT,
    "topic1" TEXT,
    "topic2" TEXT,
    "topic3" TEXT,
    "data" TEXT NOT NULL,
    "eventName" TEXT,
    "decodedLog" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "transactionIndex" INTEGER NOT NULL,
    "logIndex" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contract_events_pkey" PRIMARY KEY ("transactionHash","logIndex")
);

-- CreateTable
CREATE TABLE "chain_indexers" (
    "chainId" INTEGER NOT NULL,
    "lastIndexedBlock" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chain_indexers_pkey" PRIMARY KEY ("chainId")
);

-- CreateIndex
CREATE INDEX "contract_subscriptions_chainId_idx" ON "contract_subscriptions"("chainId");
