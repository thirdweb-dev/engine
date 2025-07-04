import type { Static } from "@sinclair/typebox";
import { maybeBigInt } from "../../shared/utils/primitive-types";
import type {
  txOverridesSchema,
  txOverridesWithValueSchema,
} from "../schemas/tx-overrides";

export const parseTransactionOverrides = (
  overrides:
    | Static<typeof txOverridesSchema>["txOverrides"]
    | Static<typeof txOverridesWithValueSchema>["txOverrides"],
) => {
  if (!overrides) {
    return {};
  }

  return {
    overrides: {
      gas: maybeBigInt(overrides.gas),
      gasPrice: maybeBigInt(overrides.gasPrice),
      maxFeePerGas: maybeBigInt(overrides.maxFeePerGas),
      maxPriorityFeePerGas: maybeBigInt(overrides.maxPriorityFeePerGas),
      gasFeeCeiling: maybeBigInt(overrides.gasFeeCeiling),
    },
    timeoutSeconds: overrides.timeoutSeconds,
    // `value` may not be in the overrides object.
    value: "value" in overrides ? maybeBigInt(overrides.value) : undefined,
  };
};
