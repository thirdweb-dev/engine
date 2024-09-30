import { Type } from "@sinclair/typebox";
import { WeiAmountStringSchema } from "./number";

export const txOverridesSchema = Type.Object({
  txOverrides: Type.Optional(
    Type.Object({
      gas: Type.Optional(
        Type.String({
          examples: ["530000"],
          description: "Gas limit for the transaction",
        }),
      ),

      // Overriding `gasPrice` is currently not supported.

      maxFeePerGas: Type.Optional({
        ...WeiAmountStringSchema,
        description: "Maximum fee per gas",
      }),
      maxPriorityFeePerGas: Type.Optional({
        ...WeiAmountStringSchema,
        description: "Maximum priority fee per gas",
      }),
      timeoutSeconds: Type.Optional(
        Type.Integer({
          examples: ["7200"],
          description:
            "Maximum duration that a transaction is valid. If a transaction cannot be sent before the timeout, the transaction will be set to 'errored'. Default: no timeout",
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
