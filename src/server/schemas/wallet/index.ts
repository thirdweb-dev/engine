import { Type } from "@sinclair/typebox";
import { AddressSchema } from "../address";

export const walletHeaderSchema = Type.Object({
  "x-backend-wallet-address": {
    ...AddressSchema,
    description: "Backend wallet address",
  },
  "x-idempotency-key": Type.Optional(
    Type.String({
      description:
        "A string that uniquely identifies this transaction. Submitting the same idempotency key will not enqueue a new transaction for 24 hours.",
    }),
  ),
});

export const walletWithAAHeaderSchema = Type.Object({
  ...walletHeaderSchema.properties,
  "x-account-address": Type.Optional({
    ...AddressSchema,
    description: "Smart account address",
  }),
});

export const walletParamSchema = Type.Object({
  chain: Type.String({
    examples: ["80002"],
    description: "Chain name",
  }),
  walletAddress: {
    ...AddressSchema,
    description: "Backend wallet address",
  },
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
