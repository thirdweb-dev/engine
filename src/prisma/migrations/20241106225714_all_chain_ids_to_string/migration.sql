/*
  Warnings:

  - The primary key for the `chain_indexers` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- AlterTable
ALTER TABLE "chain_indexers" DROP CONSTRAINT "chain_indexers_pkey",
ALTER COLUMN "chainId" SET DATA TYPE TEXT,
ADD CONSTRAINT "chain_indexers_pkey" PRIMARY KEY ("chainId");

-- AlterTable
ALTER TABLE "contract_event_logs" ALTER COLUMN "chainId" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "contract_transaction_receipts" ALTER COLUMN "chainId" SET DATA TYPE TEXT;
