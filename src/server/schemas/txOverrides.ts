import { Type } from "@sinclair/typebox";

export const txOverridesSchema = Type.Object({
  txOverrides: Type.Optional(
    Type.Object({
      gas: Type.Optional(
        Type.String({
          examples: ["530000"],
          description: "Gas limit for the transaction",
        }),
      ),
      maxFeePerGas: Type.Optional(
        Type.String({
          examples: ["1000000000"],
          description: "Maximum fee per gas",
        }),
      ),
      maxPriorityFeePerGas: Type.Optional(
        Type.String({
          examples: ["1000000000"],
          description: "Maximum priority fee per gas",
        }),
      ),
    }),
  ),
});

export const txOverridesWithValueSchema = Type.Object({
  txOverrides: Type.Optional(
    Type.Object({
      ...txOverridesSchema.properties.txOverrides.properties,
      value: Type.Optional(
        Type.String({
          examples: ["10000000000"],
          description: "Amount of native currency to send",
        }),
      ),
    }),
  ),
});

export type TxOverrides = {
  gas?: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  value?: string;
};
