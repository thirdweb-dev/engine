-- AlterTable
ALTER TABLE "wallet_details" ADD COLUMN     "alias" TEXT;

-- CreateTable
CREATE TABLE "engine_configuration" (
    "id" TEXT NOT NULL,
    "awsAccessKey" TEXT,
    "awsSecretAccessKey" TEXT,
    "awsRegion" TEXT,
    "gcpProjectId" TEXT,
    "gcpKMSRingId" TEXT,
    "gcpLocationId" TEXT,
    "gcpAppCredentialEmail" TEXT,
    "gcpAppCredentialPrivateKey" TEXT,

    CONSTRAINT "engine_configuration_pkey" PRIMARY KEY ("id")
);
