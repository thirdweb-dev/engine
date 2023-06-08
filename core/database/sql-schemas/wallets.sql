CREATE TABLE wallets (
    "walletAddress" VARCHAR(42) NOT NULL,
    "chainId" VARCHAR(40) NOT NULL,
    "walletType" VARCHAR(50) NOT NULL,
    "blockchainNonce" BIGINT NOT NULL,
    "lastSyncedTimestamp" TIMESTAMP,
    "lastUsedNonce" BIGINT NOT NULL
);
