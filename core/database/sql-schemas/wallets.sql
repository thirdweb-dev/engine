CREATE TABLE IF NOT EXISTS wallets (
    "walletAddress" VARCHAR(255) NOT NULL,
    "chainId" VARCHAR(255) NOT NULL,
    "walletType" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(255),
    "blockchainNonce" BIGINT NOT NULL,
    "lastSyncedTimestamp" TIMESTAMP,
    "lastUsedNonce" BIGINT NOT NULL,
    "awsKmsKeyId" VARCHAR(255),
    "awsKmsArn" VARCHAR(255),
    PRIMARY KEY ("walletAddress", "chainId")
);

ALTER TABLE wallets
ALTER COLUMN "chainId" TYPE VARCHAR(255),
ALTER COLUMN "walletType" TYPE VARCHAR(255),
ALTER COLUMN "blockchainNonce" TYPE BIGINT,
ALTER COLUMN "lastUsedNonce" TYPE BIGINT,
ADD COLUMN IF NOT EXISTS "awsKmsKeyId" VARCHAR(255),
ADD COLUMN IF NOT EXISTS "awsKmsArn" VARCHAR(255),
ADD COLUMN IF NOT EXISTS "slug" VARCHAR(255),
DROP COLUMN IF EXISTS "chainName";