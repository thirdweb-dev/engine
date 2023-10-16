-- AlterTable
ALTER TABLE "configuration" ADD COLUMN     "awsAccessKeyId" TEXT,
ADD COLUMN     "awsRegion" TEXT,
ADD COLUMN     "awsSecretAccessKey" TEXT,
ADD COLUMN     "gcpApplicationCredentialEmail" TEXT,
ADD COLUMN     "gcpApplicationCredentialPrivateKey" TEXT,
ADD COLUMN     "gcpApplicationProjectId" TEXT,
ADD COLUMN     "gcpKmsKeyRingId" TEXT,
ADD COLUMN     "gcpKmsLocationId" TEXT;
