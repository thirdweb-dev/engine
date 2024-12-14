export enum WalletType {
  local = "local",
  awsKms = "aws-kms",
  gcpKms = "gcp-kms",

  // Smart wallets
  smartAwsKms = "smart:aws-kms",
  smartGcpKms = "smart:gcp-kms",
  smartLocal = "smart:local",
}

export type WalletTypeUnion = `${WalletType}`;
