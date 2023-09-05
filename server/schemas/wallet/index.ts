import { Type } from "@sinclair/typebox";

export const walletParamSchema = Type.Object({
  network: Type.String({
    examples: ["mumbai"],
    description: "Add Chain ID or Chain Name",
  }),
  wallet_address: Type.String({
    examples: ["0x..."],
    description: "Add Wallet Address",
  }),
});

// CREATE TABLE IF NOT EXISTS wallets (
//   "walletAddress" VARCHAR(255) NOT NULL,
//   "chainId" VARCHAR(255) NOT NULL,
//   "walletType" VARCHAR(255) NOT NULL,
//   "blockchainNonce" BIGINT NOT NULL,
//   "lastSyncedTimestamp" TIMESTAMP,
//   "lastUsedNonce" BIGINT NOT NULL,
//   -- AWS
//   "aws_kms_keyId" VARCHAR(255),
//   "aws_kms_arn" VARCHAR(255),
//   --  KEYID
//   --  ARN
//   -- GCP
//   PRIMARY KEY ("walletAddress", "chainId")
export const walletTableSchema = Type.Optional(
  Type.Object({
    walletAddress: Type.String({
      description: "Wallet Address",
    }),
    chainId: Type.String({
      description: "Chain ID",
    }),
    walletType: Type.String({
      description: "Wallet Type",
    }),
    blockchainNonce: Type.Number({
      description: "Blockchain Nonce",
    }),
    lastSyncedTimestamp: Type.String({
      description: "Last Synced Timestamp",
    }),
    lastUsedNonce: Type.Number({
      description: "Last Used Nonce",
    }),
    awsKmsKeyId: Type.Optional(
      Type.String({
        description: "AWS KMS Key ID",
      }),
    ),
    awsKmsArn: Type.Optional(
      Type.String({
        description: "AWS KMS ARN",
      }),
    ),
    gcpKmsKeyRingId: Type.Optional(
      Type.String({
        description: "Google Cloud KMS Key Ring ID",
      }),
    ),
    gcpKmsKeyId: Type.Optional(
      Type.String({
        description: "Google Cloud KMS Key ID",
      }),
    ),
    gcpKmsKeyVersion: Type.Optional(
      Type.String({
        description: "Google Cloud KMS Key Version",
      }),
    ),
  }),
);

export interface createKMSEOAResponse {
  arn: string;
  keyId: string;
}

export enum WalletConfigType {
  aws_kms = "aws_kms",
  local = "local",
  gcp_kms = "gcp_kms",
  ppk = "ppk",
}
