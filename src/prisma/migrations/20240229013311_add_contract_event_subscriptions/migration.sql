-- AlterTable
ALTER TABLE "configuration" ADD COLUMN     "cursorDelaySeconds" INTEGER NOT NULL DEFAULT 2,
ADD COLUMN     "indexerListenerCronSchedule" TEXT,
ADD COLUMN     "maxBlocksToIndex" INTEGER NOT NULL DEFAULT 5;

-- CreateTable
CREATE TABLE "contract_subscriptions" (
    "id" TEXT NOT NULL,
    "chainId" INTEGER NOT NULL,
    "contractAddress" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "contract_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_event_logs" (
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

    CONSTRAINT "contract_event_logs_pkey" PRIMARY KEY ("transactionHash","logIndex")
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

-- CreateIndex
CREATE INDEX "contract_event_logs_timestamp_idx" ON "contract_event_logs"("timestamp");

-- CreateIndex
CREATE INDEX "contract_event_logs_blockNumber_idx" ON "contract_event_logs"("blockNumber");

-- CreateIndex
CREATE INDEX "contract_event_logs_contractAddress_idx" ON "contract_event_logs"("contractAddress");

-- CreateIndex
CREATE INDEX "contract_event_logs_topic0_idx" ON "contract_event_logs"("topic0");

-- CreateIndex
CREATE INDEX "contract_event_logs_topic1_idx" ON "contract_event_logs"("topic1");

-- CreateIndex
CREATE INDEX "contract_event_logs_topic2_idx" ON "contract_event_logs"("topic2");

-- CreateIndex
CREATE INDEX "contract_event_logs_topic3_idx" ON "contract_event_logs"("topic3");
