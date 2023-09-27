-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ALTER COLUMN "callGasLimit" SET DATA TYPE TEXT,
ALTER COLUMN "preVerificationGas" SET DATA TYPE TEXT,
ALTER COLUMN "verificationGasLimit" SET DATA TYPE TEXT;
