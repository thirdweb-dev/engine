CREATE TABLE wallets (
    walletAddress VARCHAR(42) NOT NULL,
    chainId VARCHAR(40) NOT NULL,
    walletType VARCHAR(10) NOT NULL,
    blockchainNonce INT NOT NULL,
    lastSyncedTimestamp TIMESTAMP,
    lastUsedNonce INT NOT NULL
);
