export enum CircleWalletType {
  circle = "circle",

  // Smart wallets
  smartCircle = "smart:circle",
}

export enum LegacyWalletType {
  local = "local",
  awsKms = "aws-kms",
  gcpKms = "gcp-kms",

  // Smart wallets
  smartAwsKms = "smart:aws-kms",
  smartGcpKms = "smart:gcp-kms",
  smartLocal = "smart:local",
}

export enum WalletType {
  // Legacy wallet types
  local = "local",
  awsKms = "aws-kms",
  gcpKms = "gcp-kms",

  // Smart wallets
  smartAwsKms = "smart:aws-kms",
  smartGcpKms = "smart:gcp-kms",
  smartLocal = "smart:local",

  //breaking
  circle = "circle",

  // Smart wallets
  smartCircle = "smart:circle",
}
