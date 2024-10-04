import type { Static } from "@sinclair/typebox";
import { maybeBigInt } from "../../utils/primitiveTypes";
import type { InsertedTransaction } from "../../utils/transaction/types";
import type {
  txOverridesSchema,
  txOverridesWithValueSchema,
} from "../schemas/txOverrides";

export const parseTransactionOverrides = (
  overrides:
    | Static<typeof txOverridesSchema>["txOverrides"]
    | Static<typeof txOverridesWithValueSchema>["txOverrides"],
): Partial<InsertedTransaction> => {
  if (!overrides) {
    return {};
  }

  return {
    overrides: {
      gas: maybeBigInt(overrides.gas),
      maxFeePerGas: maybeBigInt(overrides.maxFeePerGas),
      maxPriorityFeePerGas: maybeBigInt(overrides.maxPriorityFeePerGas),
    },
    timeoutSeconds: overrides.timeoutSeconds,
    // `value` may not be in the overrides object.
    value: "value" in overrides ? maybeBigInt(overrides.value) : undefined,
  };
};
