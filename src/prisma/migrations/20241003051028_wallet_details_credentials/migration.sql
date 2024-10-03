-- AlterTable
ALTER TABLE "wallet_details" ADD COLUMN     "awsKmsAccessKeyId" TEXT,
ADD COLUMN     "awsKmsSecretAccessKey" TEXT,
ADD COLUMN     "gcpApplicationCredentialEmail" TEXT,
ADD COLUMN     "gcpApplicationCredentialPrivateKey" TEXT;
