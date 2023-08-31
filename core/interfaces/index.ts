export interface WalletData {
  walletAddress: string;
  chainId: string;
  lastUsedNonce: number;
  blockchainNonce: number;
  lastSyncedTimestamp: Date;
  walletType: string;
}
