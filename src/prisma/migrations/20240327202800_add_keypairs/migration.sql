-- CreateTable
CREATE TABLE "keypairs" (
    "hash" TEXT NOT NULL,
    "publicKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "keypairs_pkey" PRIMARY KEY ("hash")
);
