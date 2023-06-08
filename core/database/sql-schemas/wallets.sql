CREATE TABLE IF NOT EXISTS wallets (
    "walletAddress" VARCHAR(42) NOT NULL,
    "chainId" VARCHAR(100) NOT NULL,
    "walletType" VARCHAR(100) NOT NULL,
    "blockchainNonce" BIGINT NOT NULL,
    "lastSyncedTimestamp" TIMESTAMP,
    "lastUsedNonce" BIGINT NOT NULL
);

ALTER TABLE wallets
ALTER COLUMN "chainId" TYPE VARCHAR(100),
ALTER COLUMN "walletType" TYPE VARCHAR(100),
ALTER COLUMN "blockchainNonce" TYPE BIGINT,
ALTER COLUMN "lastUsedNonce" TYPE BIGINT;