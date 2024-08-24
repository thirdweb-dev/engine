import { Type } from "@sinclair/typebox";
import { DEFAULT_TIMEOUT_SECONDS_IF_ENFORCED } from "../../utils/request";

export const txOverridesSchema = Type.Optional(
  Type.Object({
    gas: Type.Optional(
      Type.String({
        examples: ["530000"],
        description: "The gas limit for the transaction.",
      }),
    ),
    maxFeePerGas: Type.Optional(
      Type.String({
        examples: ["1000000000"],
        description: "The maximum gas fee for the transaction.",
      }),
    ),
    maxPriorityFeePerGas: Type.Optional(
      Type.String({
        examples: ["1000000000"],
        description: "The maximum priority gas fee for the transaction.",
      }),
    ),
    timeoutSeconds: Type.Optional(
      Type.Integer({
        examples: ["28800"],
        description: `Sets the maximum time to send a queued transaction. If exceeded, the transaction is marked as "errored" and not sent. Default: no timeout (if gas overrides are set, then ${DEFAULT_TIMEOUT_SECONDS_IF_ENFORCED} seconds).`,
      }),
    ),
  }),
);

export const txOverridesWithValueSchema = Type.Object({
  ...txOverridesSchema.properties,
  value: Type.Optional(
    Type.String({
      examples: ["10000000000"],
      description:
        "Amount of native currency in wei to send with this transaction. Used to transfer funds or pay a contract.",
    }),
  ),
});
