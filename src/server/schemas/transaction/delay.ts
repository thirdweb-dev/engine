import { Type } from "@sinclair/typebox";

const BaseDelaySchema = Type.Object({
  timestamp: Type.String({
    description: "ISO timestamp when the delay occurred",
  }),
});

// Specific delay schemas with their required properties
const GasDelaySchema = Type.Intersect([
  BaseDelaySchema,
  Type.Object({
    reason: Type.Literal("max_fee_per_gas_too_low"),
    requestedMaxFeePerGas: Type.String({
      description: "maxFeePerGas requested by the user",
    }),
    currentMaxFeePerGas: Type.String({
      description: "maxFeePerGas on chain",
    }),
  }),
]);

export const TransactionDelaySchema = Type.Union([GasDelaySchema]);
