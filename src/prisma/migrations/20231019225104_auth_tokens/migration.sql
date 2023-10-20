-- DropIndex
DROP INDEX "configuration_id_key";

-- CreateTable
CREATE TABLE "permissions" (
    "walletAddress" TEXT NOT NULL,
    "permissions" TEXT NOT NULL,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("walletAddress")
);

-- CreateTable
CREATE TABLE "tokens" (
    "id" TEXT NOT NULL,
    "tokenMask" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "isAccessToken" BOOLEAN NOT NULL,

    CONSTRAINT "tokens_pkey" PRIMARY KEY ("id")
);
