-- AlterTable
ALTER TABLE "configuration" ADD COLUMN     "walletProviderConfigs" JSONB NOT NULL DEFAULT '{}';

-- AlterTable
ALTER TABLE "wallet_details" ADD COLUMN     "credentialId" TEXT,
ADD COLUMN     "platformIdentifiers" JSONB;

-- CreateTable
CREATE TABLE "wallet_credentials" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "wallet_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "wallet_credentials_type_idx" ON "wallet_credentials"("type");

-- CreateIndex
CREATE UNIQUE INDEX "wallet_credentials_type_is_default_key" ON "wallet_credentials"("type", "isDefault");

-- AddForeignKey
ALTER TABLE "wallet_details" ADD CONSTRAINT "wallet_details_credentialId_fkey" FOREIGN KEY ("credentialId") REFERENCES "wallet_credentials"("id") ON DELETE SET NULL ON UPDATE CASCADE;
