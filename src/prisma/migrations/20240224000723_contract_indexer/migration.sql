-- CreateTable
CREATE TABLE "IndexedContracts" (
    "chainId" INTEGER NOT NULL,
    "contractAddress" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IndexedContracts_pkey" PRIMARY KEY ("chainId","contractAddress")
);

-- CreateTable
CREATE TABLE "ContractLogs" (
    "chainId" INTEGER NOT NULL,
    "blockNumber" INTEGER NOT NULL,
    "contractAddress" TEXT NOT NULL,
    "transactionHash" TEXT NOT NULL,
    "topic0" TEXT,
    "topic1" TEXT,
    "topic2" TEXT,
    "topic3" TEXT,
    "data" TEXT NOT NULL,
    "decodedLog" JSONB NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "transactionIndex" INTEGER NOT NULL,
    "logIndex" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractLogs_pkey" PRIMARY KEY ("transactionHash","logIndex")
);

-- CreateTable
CREATE TABLE "ChainIndexers" (
    "chainId" INTEGER NOT NULL,
    "lastIndexedBlock" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChainIndexers_pkey" PRIMARY KEY ("chainId")
);

-- AddForeignKey
ALTER TABLE "IndexedContracts" ADD CONSTRAINT "IndexedContracts_chainId_fkey" FOREIGN KEY ("chainId") REFERENCES "ChainIndexers"("chainId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractLogs" ADD CONSTRAINT "ContractLogs_chainId_contractAddress_fkey" FOREIGN KEY ("chainId", "contractAddress") REFERENCES "IndexedContracts"("chainId", "contractAddress") ON DELETE RESTRICT ON UPDATE CASCADE;
