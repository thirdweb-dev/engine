-- CreateTable
CREATE TABLE "configuration" (
    "id" TEXT NOT NULL,
    "minTxsToProcess" INTEGER NOT NULL,
    "maxTxsToProcess" INTEGER NOT NULL,
    "minedTxsCronSchedule" TEXT,
    "maxTxsToUpdate" INTEGER NOT NULL,
    "retryTxsCronSchedule" TEXT,
    "minEllapsedBlocksBeforeRetry" INTEGER NOT NULL,
    "maxFeePerGasForRetries" TEXT NOT NULL,
    "maxPriorityFeePerGasForRetries" TEXT NOT NULL,
    "maxRetriesPerTx" INTEGER NOT NULL,

    CONSTRAINT "configuration_pkey" PRIMARY KEY ("id")
);
