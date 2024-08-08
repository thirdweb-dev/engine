import { Type } from "@sinclair/typebox";
import { env } from "../../../utils/env";

export const walletHeaderSchema = Type.Object({
  "x-backend-wallet-address": Type.String({
    examples: ["0x..."],
    description: "Backend wallet address",
    maxLength: 42,
    minLength: 42,
    pattern: "^0x[0-9a-zA-Z]+",
  }),
  "x-idempotency-key": Type.Optional(
    Type.String({
      description: `Transactions submitted with the same idempotency key will be de-duplicated. Only the last ${env.TRANSACTION_HISTORY_COUNT} transactions are compared.`,
    }),
  ),
});

export const walletWithAAHeaderSchema = Type.Object({
  ...walletHeaderSchema.properties,
  "x-account-address": Type.Optional(
    Type.String({
      description: "Smart account address",
      maxLength: 42,
      minLength: 42,
      pattern: "^0x[0-9a-zA-Z]+",
    }),
  ),
});

export const walletChainParamSchema = Type.Object({
  chain: Type.String({
    examples: ["80002"],
    description: "Chain ID",
  }),
});

export const walletWithAddressParamSchema = Type.Object({
  ...walletChainParamSchema.properties,
  walletAddress: Type.String({
    examples: ["0x..."],
    description: "Backend wallet address",
    maxLength: 42,
    minLength: 42,
    pattern: "^0x[0-9a-zA-Z]+",
  }),
});
