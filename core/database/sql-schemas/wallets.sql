CREATE TABLE IF NOT EXISTS wallets (
    "walletAddress" VARCHAR(42) NOT NULL,
    "chainId" VARCHAR(40) NOT NULL,
    "walletType" VARCHAR(10) NOT NULL,
    "blockchainNonce" INT NOT NULL,
    "lastSyncedTimestamp" TIMESTAMP,
    "lastUsedNonce" INT NOT NULL
);

ALTER TABLE wallets
ALTER COLUMN "chainId" TYPE VARCHAR(100),
ALTER COLUMN "walletType" TYPE VARCHAR(100),
ALTER COLUMN "blockchainNonce" TYPE BIGINT,
ALTER COLUMN "lastUsedNonce" TYPE BIGINT;