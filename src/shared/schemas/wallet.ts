import * as z from "zod";

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

  // New credential based wallet types
  circle = "circle",

  // Smart wallets
  smartCircle = "smart:circle",
}

export const cirlceEntitySecretZodSchema = z.string().regex(/^[0-9a-fA-F]{64}$/, {
  message: "entitySecret must be a 32-byte hex string",
});
