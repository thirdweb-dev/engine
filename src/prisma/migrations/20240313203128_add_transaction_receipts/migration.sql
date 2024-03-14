-- AlterTable
ALTER TABLE "configuration" ALTER COLUMN "maxBlocksToIndex" SET DEFAULT 25;

-- CreateTable
CREATE TABLE "contract_transaction_receipts" (
    "chainId" INTEGER NOT NULL,
    "blockNumber" INTEGER NOT NULL,
    "contractAddress" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "transactionHash" TEXT NOT NULL,
    "blockHash" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "data" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "from" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "transactionIndex" INTEGER NOT NULL,
    "gasUsed" TEXT NOT NULL,
    "effectiveGasPrice" TEXT NOT NULL,
    "status" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- CreateIndex
CREATE INDEX "contract_transaction_receipts_contractId_timestamp_idx" ON "contract_transaction_receipts"("contractId", "timestamp");

-- CreateIndex
CREATE INDEX "contract_transaction_receipts_contractId_blockNumber_idx" ON "contract_transaction_receipts"("contractId", "blockNumber");

-- CreateIndex
CREATE UNIQUE INDEX "contract_transaction_receipts_chainId_transactionHash_key" ON "contract_transaction_receipts"("chainId", "transactionHash");
