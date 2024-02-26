/*
  Warnings:

  - Added the required column `maxBlocksToIndex` to the `configuration` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "configuration" ADD COLUMN     "indexerListenerCronSchedule" TEXT,
ADD COLUMN     "maxBlocksToIndex" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "IndexedContracts" (
    "chainId" INTEGER NOT NULL,
    "contractAddress" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IndexedContracts_pkey" PRIMARY KEY ("chainId","contractAddress")
);

-- CreateTable
CREATE TABLE "ContractLogs" (
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

    CONSTRAINT "ContractLogs_pkey" PRIMARY KEY ("transactionHash","logIndex")
);

-- CreateTable
CREATE TABLE "ChainIndexers" (
    "chainId" INTEGER NOT NULL,
    "lastIndexedBlock" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChainIndexers_pkey" PRIMARY KEY ("chainId")
);

-- CreateIndex
CREATE INDEX "IndexedContracts_chainId_idx" ON "IndexedContracts"("chainId");
