/*
  Warnings:

  - The primary key for the `wallet_nonce` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- AlterTable
ALTER TABLE "configuration" ADD COLUMN     "chainOverrides" TEXT;

-- AlterTable
ALTER TABLE "transactions" ALTER COLUMN "chainId" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "wallet_nonce" DROP CONSTRAINT "wallet_nonce_pkey",
ALTER COLUMN "chainId" SET DATA TYPE TEXT,
ADD CONSTRAINT "wallet_nonce_pkey" PRIMARY KEY ("address", "chainId");
