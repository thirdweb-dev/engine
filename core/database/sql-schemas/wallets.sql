CREATE TABLE IF NOT EXISTS wallets (
    "walletAddress" VARCHAR(255) NOT NULL,
    "chainId" VARCHAR(255) NOT NULL,
    "walletType" VARCHAR(255) NOT NULL,
    "blockchainNonce" BIGINT NOT NULL,
    "lastSyncedTimestamp" TIMESTAMP,
    "lastUsedNonce" BIGINT NOT NULL
);

ALTER TABLE wallets
ALTER COLUMN "chainId" TYPE VARCHAR(255),
ALTER COLUMN "walletType" TYPE VARCHAR(255),
ALTER COLUMN "blockchainNonce" TYPE BIGINT,
ALTER COLUMN "lastUsedNonce" TYPE BIGINT,
ADD CONSTRAINT wallets_pkey PRIMARY KEY ("walletAddress", "chainId");