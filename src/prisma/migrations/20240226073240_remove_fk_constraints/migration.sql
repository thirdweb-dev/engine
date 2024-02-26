-- DropForeignKey
ALTER TABLE "ContractLogs" DROP CONSTRAINT "ContractLogs_chainId_contractAddress_fkey";

-- DropForeignKey
ALTER TABLE "IndexedContracts" DROP CONSTRAINT "IndexedContracts_chainId_fkey";
