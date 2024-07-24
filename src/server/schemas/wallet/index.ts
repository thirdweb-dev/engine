import { Type } from "@sinclair/typebox";
import { env } from "../../../utils/env";

export const walletHeaderSchema = Type.Object({
  "x-backend-wallet-address": Type.String({
    examples: ["0x..."],
    description: "Backend wallet address",
  }),
  "x-idempotency-key": Type.Optional(
    Type.String({
      description: `A string that uniquely identifies this transaction. Submitting the same idempotency key will not enqueue a new transaction for ${env.PRUNE_TRANSACTIONS} day(s).`,
    }),
  ),
});

export const walletWithAAHeaderSchema = Type.Object({
  ...walletHeaderSchema.properties,
  "x-account-address": Type.Optional(
    Type.String({
      description: "Smart account address",
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
  }),
});
