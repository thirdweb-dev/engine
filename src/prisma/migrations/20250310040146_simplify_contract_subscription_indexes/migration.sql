/*
  Warnings:

  - The primary key for the `contract_event_logs` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- DropIndex
DROP INDEX "contract_event_logs_blockNumber_idx";

-- DropIndex
DROP INDEX "contract_event_logs_contractAddress_idx";

-- DropIndex
DROP INDEX "contract_event_logs_timestamp_idx";

-- DropIndex
DROP INDEX "contract_event_logs_topic0_idx";

-- DropIndex
DROP INDEX "contract_event_logs_topic1_idx";

-- DropIndex
DROP INDEX "contract_event_logs_topic2_idx";

-- DropIndex
DROP INDEX "contract_event_logs_topic3_idx";

-- DropIndex
DROP INDEX "contract_transaction_receipts_chainId_transactionHash_key";

-- DropIndex
DROP INDEX "contract_transaction_receipts_contractId_blockNumber_idx";

-- DropIndex
DROP INDEX "contract_transaction_receipts_contractId_timestamp_idx";

-- AlterTable
ALTER TABLE "contract_event_logs" DROP CONSTRAINT "contract_event_logs_pkey",
ADD CONSTRAINT "contract_event_logs_pkey" PRIMARY KEY ("chainId", "blockNumber", "transactionHash", "logIndex");

-- AlterTable
ALTER TABLE "contract_transaction_receipts" ADD CONSTRAINT "contract_transaction_receipts_pkey" PRIMARY KEY ("chainId", "blockNumber", "transactionHash");

-- CreateIndex
CREATE INDEX "contract_event_logs_timestamp_chainId_contractAddress_idx" ON "contract_event_logs"("timestamp", "chainId", "contractAddress");

-- CreateIndex
CREATE INDEX "contract_transaction_receipts_timestamp_chainId_contractAdd_idx" ON "contract_transaction_receipts"("timestamp", "chainId", "contractAddress");
