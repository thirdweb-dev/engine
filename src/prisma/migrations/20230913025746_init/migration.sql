-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "chainId" INTEGER NOT NULL,
    "fromAddress" TEXT NOT NULL,
    "toAddress" TEXT,
    "data" TEXT,
    "value" TEXT,
    "nonce" INTEGER,
    "gasLimit" TEXT,
    "gasPrice" TEXT,
    "maxFeePerGas" TEXT,
    "maxPriorityFeePerGas" TEXT,
    "transactionType" INTEGER,
    "transactionHash" TEXT,
    "functionName" TEXT,
    "functionArgs" TEXT,
    "extension" TEXT,
    "deployedContractAddress" TEXT,
    "deployedContractType" TEXT,
    "queuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "minedAt" TIMESTAMP(3),
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "retryGasValues" BOOLEAN DEFAULT false,
    "retryMaxPriorityFeePerGas" TEXT,
    "retryMaxFeePerGas" TEXT,
    "errorMessage" TEXT,
    "sentAtBlockNumber" INTEGER,
    "blockNumber" INTEGER,

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
CREATE TABLE "wallet_nonce" (
    "address" TEXT NOT NULL,
    "chainId" INTEGER NOT NULL,
    "nonce" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "wallet_nonce_pkey" PRIMARY KEY ("address","chainId")
);

-- AddForeignKey
ALTER TABLE "wallet_nonce" ADD CONSTRAINT "wallet_nonce_address_fkey" FOREIGN KEY ("address") REFERENCES "wallet_details"("address") ON DELETE RESTRICT ON UPDATE CASCADE;
