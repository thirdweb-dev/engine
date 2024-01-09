-- CreateTable
CREATE TABLE "bundlers" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "chainId" TEXT NOT NULL,
    "backendWalletAddress" TEXT NOT NULL,
    "entrypointAddress" TEXT NOT NULL,

    CONSTRAINT "bundlers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bundler_user_operations" (
    "id" TEXT NOT NULL,
    "chainId" TEXT NOT NULL,
    "userOpHash" TEXT NOT NULL,
    "sender" TEXT NOT NULL,
    "nonce" TEXT NOT NULL,
    "initCode" TEXT NOT NULL,
    "callData" TEXT NOT NULL,
    "callGasLimit" TEXT NOT NULL,
    "verificationGasLimit" TEXT NOT NULL,
    "preVerificationGas" TEXT NOT NULL,
    "maxFeePerGas" TEXT NOT NULL,
    "maxPriorityFeePerGas" TEXT NOT NULL,
    "signature" TEXT NOT NULL,
    "paymasterAndData" TEXT NOT NULL,
    "backendWalletAddress" TEXT NOT NULL,
    "entrypointAddress" TEXT NOT NULL,
    "queuedAt" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),

    CONSTRAINT "bundler_user_operations_pkey" PRIMARY KEY ("id")
);
