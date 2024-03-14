import { Type } from "@sinclair/typebox";

export const walletAuthSchema = Type.Object({
  "x-backend-wallet-address": Type.String({
    description: "Backend wallet address",
  }),
  "x-account-address": Type.Optional(
    Type.String({
      description: "Smart account address",
    }),
  ),
});

export const walletParamSchema = Type.Object({
  chain: Type.String({
    examples: ["mumbai"],
    description: "Chain name",
  }),
  walletAddress: Type.String({
    examples: ["0x..."],
    description: "Backend wallet address",
  }),
});

export const walletTableSchema = Type.Optional(
  Type.Object({
    address: Type.String({
      description: "Wallet address",
    }),
    chainId: Type.Number({
      description: "Chain ID",
    }),
    type: Type.String({
      description: "Wallet type",
    }),
    nonce: Type.Number({
      description: "Blockchain nonce",
    }),
    awsKmsKeyId: Type.Union([
      Type.String({
        description: "AWS KMS key ID",
      }),
      Type.Null(),
    ]),
    awsKmsArn: Type.Union([
      Type.String({
        description: "AWS KMS ARN",
      }),
      Type.Null(),
    ]),
    gcpKmsKeyRingId: Type.Union([
      Type.String({
        description: "Google Cloud KMS key ring ID",
      }),
      Type.Null(),
    ]),
    gcpKmsKeyId: Type.Union([
      Type.String({
        description: "Google Cloud KMS key ID",
      }),
      Type.Null(),
    ]),
    gcpKmsKeyVersionId: Type.Union([
      Type.String({
        description: "Google Cloud KMS key version ID",
      }),
      Type.Null(),
    ]),
    gcpKmsLocationId: Type.Union([
      Type.String({
        description: "Google Cloud KMS key ring location ID",
      }),
      Type.Null(),
    ]),
  }),
);

export interface createKMSEOAResponse {
  arn: string;
  keyId: string;
}
