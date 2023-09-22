/*
  Warnings:

  - You are about to drop the `engine_configuration` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "engine_configuration";

-- CreateTable
CREATE TABLE "configuration" (
    "id" TEXT NOT NULL,
    "configType" TEXT NOT NULL,
    "awsAccessKey" TEXT,
    "awsAccessKeyIV" TEXT,
    "awsAccessKeyAuthTag" TEXT,
    "awsSecretAccessKey" TEXT,
    "awsSecretAccessKeyIV" TEXT,
    "awsSecretAccessKeyAuthTag" TEXT,
    "awsRegion" TEXT,
    "awsRegionIV" TEXT,
    "awsRegionAuthTag" TEXT,
    "gcpProjectId" TEXT,
    "gcpProjectIdIV" TEXT,
    "gcpProjectIdAuthTag" TEXT,
    "gcpKmsRingId" TEXT,
    "gcpKmsRingIdIV" TEXT,
    "gcpKmsRingIdAuthTag" TEXT,
    "gcpLocationId" TEXT,
    "gcpLocationIdIV" TEXT,
    "gcpLocationIdAuthTag" TEXT,
    "gcpAppCredentialEmail" TEXT,
    "gcpAppCredentialEmailIV" TEXT,
    "gcpAppCredentialEmailAuthTag" TEXT,
    "gcpAppCredentialPrivateKey" TEXT,
    "gcpAppCredentialPrivateKeyIV" TEXT,
    "gcpAppCredentialPrivateKeyAuthTag" TEXT,

    CONSTRAINT "configuration_pkey" PRIMARY KEY ("id")
);
