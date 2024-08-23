import { Type } from "@sinclair/typebox";
import { env } from "../../../utils/env";
import { AddressSchema } from "../address";

export const walletHeaderSchema = Type.Object({
  "x-backend-wallet-address": {
    ...AddressSchema,
    description: "Backend wallet address",
  },
  "x-idempotency-key": Type.Optional(
    Type.String({
      description: `Transactions submitted with the same idempotency key will be de-duplicated. Only the last ${env.TRANSACTION_HISTORY_COUNT} transactions are compared.`,
    }),
  ),
});

export const walletWithAAHeaderSchema = Type.Object({
  ...walletHeaderSchema.properties,
  "x-account-address": {
    ...AddressSchema,
    description: "Smart account address",
  },
});

export const walletChainParamSchema = Type.Object({
  chain: Type.String({
    examples: ["80002"],
    description: "Chain ID",
  }),
});

export const walletWithAddressParamSchema = Type.Object({
  ...walletChainParamSchema.properties,
  walletAddress: {
    ...AddressSchema,
    description: "Backend wallet address",
  },
});
