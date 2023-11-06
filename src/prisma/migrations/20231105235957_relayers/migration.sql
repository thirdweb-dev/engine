-- CreateTable
CREATE TABLE "relayers" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "chainId" TEXT NOT NULL,
    "backendWalletAddress" TEXT NOT NULL,
    "allowedContracts" TEXT,

    CONSTRAINT "relayers_pkey" PRIMARY KEY ("id")
);
