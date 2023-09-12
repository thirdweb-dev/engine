-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "chainId" TEXT NOT NULL,
    "transactionHash" TEXT NOT NULL,
    "transactionType" TEXT NOT NULL,
    "fromAddress" TEXT NOT NULL,
    "toAddress" TEXT,
    "data" TEXT,
    "value" TEXT,
    "nonce" INTEGER,
    "gasLimit" TEXT,
    "gasPrice" TEXT,
    "maxFeePerGas" TEXT,
    "maxPriorityFeePerGas" TEXT,
    "functionName" TEXT,
    "functionArgs" TEXT,
    "contractExtension" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "minedAt" TIMESTAMP(3),
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "numberOfRetries" INTEGER NOT NULL DEFAULT 0,
    "overrideGasValuesForTx" BOOLEAN NOT NULL DEFAULT false,
    "txSubmittedAtBlockNumber" INTEGER,
    "overrideMaxPriorityFeePerGas" TEXT,
    "overrideMaxFeePerGas" TEXT,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_details" (
    "address" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "awsKmsKeyId" TEXT,
    "awsKmsArn" TEXT,
    "gcpKmsKeyRingId" VARCHAR(50),
    "gcpKmsKeyId" VARCHAR(50),
    "gcpKmsKeyVersionId" VARCHAR(20),
    "gcpKmsLocationId" VARCHAR(20),
    "gcpKmsResourcePath" TEXT,

    CONSTRAINT "wallet_details_pkey" PRIMARY KEY ("address")
);

-- CreateTable
CREATE TABLE "wallet_nonces" (
    "address" TEXT NOT NULL,
    "chainId" TEXT NOT NULL,
    "nonce" INTEGER NOT NULL DEFAULT -1,

    CONSTRAINT "wallet_nonces_pkey" PRIMARY KEY ("address","chainId")
);

-- AddForeignKey
ALTER TABLE "wallet_nonces" ADD CONSTRAINT "wallet_nonces_address_fkey" FOREIGN KEY ("address") REFERENCES "wallet_details"("address") ON DELETE RESTRICT ON UPDATE CASCADE;
