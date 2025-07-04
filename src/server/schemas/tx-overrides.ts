import { Type } from "@sinclair/typebox";
import { NumberStringSchema, WeiAmountStringSchema } from "./number";

export const txOverridesSchema = Type.Object({
  txOverrides: Type.Optional(
    Type.Object({
      gas: Type.Optional({
        ...NumberStringSchema,
        examples: ["530000"],
        description: "Gas limit for the transaction",
      }),

      gasPrice: Type.Optional({
        ...WeiAmountStringSchema,
        description:
          "Gas price for the transaction. Do not use this if maxFeePerGas is set or if you want to use EIP-1559 type transactions. Only use this if you want to use legacy transactions.",
      }),
      maxFeePerGas: Type.Optional({
        ...WeiAmountStringSchema,
        description: "Maximum fee per gas",
      }),
      maxPriorityFeePerGas: Type.Optional({
        ...WeiAmountStringSchema,
        description: "Maximum priority fee per gas",
      }),

      gasFeeCeiling: Type.Optional({
        ...WeiAmountStringSchema,
        description:
          "Maximum gas fee for the transaction. This is the total maximum gas fee you are willing to pay for the transaction. If the chain gas conditions are worse than this, the transaction will be delayed until the gas conditions are better. If chain gas conditions are better than this, the transaction will be sent immediately. This value is only used to determine if the transaction should be delayed or sent immediately, and is not used to calculate the actual gas fee for the transaction.",
      }),

      timeoutSeconds: Type.Optional(
        Type.Integer({
          examples: ["7200"],
          description:
            "Maximum duration that a transaction is valid. If a transaction cannot be sent before the timeout, the transaction will be set to 'errored'. Default: no timeout",
          minimum: 1,
          maximum: 7 * 24 * 60 * 60, // 1 week
        }),
      ),
    }),
  ),
});

export const txOverridesWithValueSchema = Type.Object({
  txOverrides: Type.Optional(
    Type.Object({
      ...txOverridesSchema.properties.txOverrides.properties,
      value: Type.Optional({
        ...WeiAmountStringSchema,
        description:
          "Amount of native currency in wei to send with this transaction. Used to transfer funds or pay a contract.",
      }),
    }),
  ),
});
