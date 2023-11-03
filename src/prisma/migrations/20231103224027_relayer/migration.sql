-- CreateTable
CREATE TABLE "Relayers" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "chainId" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "allowedContracts" TEXT,

    CONSTRAINT "Relayers_pkey" PRIMARY KEY ("id")
);
