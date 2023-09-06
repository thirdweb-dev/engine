export interface WalletData {
  walletAddress: string;
  chainId: string;
  lastUsedNonce: number;
  blockchainNonce: number;
  lastSyncedTimestamp: Date;
  walletType: string;
  awsKmsKeyId?: string;
  gcpKmsKeyId?: string;
  awsKmsKeyArn?: string;
  gcpKmsKeyRingId?: string;
  gcpKmsKeyVersionId?: string;
  gcpKmsLocationId?: string;
  gcpKmsProjectId?: string;
}
