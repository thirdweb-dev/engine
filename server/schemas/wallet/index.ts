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
    description: "Chain ID name",
  }),
  wallet_address: Type.String({
    examples: ["0x..."],
    description: "Wallet Address",
  }),
});

export const walletTableSchema = Type.Optional(
  Type.Object({
    address: Type.String({
      description: "Wallet Address",
    }),
    chainId: Type.Number({
      description: "Chain ID",
    }),
    type: Type.String({
      description: "Wallet Type",
    }),
    nonce: Type.Number({
      description: "Blockchain Nonce",
    }),
    awsKmsKeyId: Type.Union([
      Type.String({
        description: "AWS KMS Key ID",
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
        description: "Google Cloud KMS Key Ring ID",
      }),
      Type.Null(),
    ]),
    gcpKmsKeyId: Type.Union([
      Type.String({
        description: "Google Cloud KMS Key ID",
      }),
      Type.Null(),
    ]),
    gcpKmsKeyVersionId: Type.Union([
      Type.String({
        description: "Google Cloud KMS Key Version ID",
      }),
      Type.Null(),
    ]),
    gcpKmsLocationId: Type.Union([
      Type.String({
        description: "Google Cloud KMS Key Ring Location ID",
      }),
      Type.Null(),
    ]),
  }),
);

export interface createKMSEOAResponse {
  arn: string;
  keyId: string;
}
