-- CreateTable
CREATE TABLE "backend_wallet_lite_access" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "dashboardUserAddress" TEXT NOT NULL,
    "accountAddress" TEXT,
    "signerAddress" TEXT,
    "encryptedJson" TEXT,
    "salt" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "backend_wallet_lite_access_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "backend_wallet_lite_access_teamId_idx" ON "backend_wallet_lite_access"("teamId");

-- AddForeignKey
ALTER TABLE "backend_wallet_lite_access" ADD CONSTRAINT "backend_wallet_lite_access_accountAddress_fkey" FOREIGN KEY ("accountAddress") REFERENCES "wallet_details"("address") ON DELETE SET NULL ON UPDATE CASCADE;
