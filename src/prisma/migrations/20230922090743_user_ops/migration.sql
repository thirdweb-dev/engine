-- DropForeignKey
ALTER TABLE "wallet_nonce" DROP CONSTRAINT "wallet_nonce_address_fkey";

-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "accountAddress" TEXT,
ADD COLUMN     "callData" TEXT,
ADD COLUMN     "callGasLimit" INTEGER,
ADD COLUMN     "initCode" TEXT,
ADD COLUMN     "paymasterAndData" TEXT,
ADD COLUMN     "preVerificationGas" INTEGER,
ADD COLUMN     "sender" TEXT,
ADD COLUMN     "signerAddress" TEXT,
ADD COLUMN     "target" TEXT,
ADD COLUMN     "userOpHash" TEXT,
ADD COLUMN     "verificationGasLimit" INTEGER,
ALTER COLUMN "fromAddress" DROP NOT NULL;
