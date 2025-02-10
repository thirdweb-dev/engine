import type { Static } from "@sinclair/typebox";
import { maybeBigInt } from "../../shared/utils/primitive-types.js";
import type { InsertedTransaction } from "../../shared/utils/transaction/types.js";
import type {
  txOverridesSchema,
  txOverridesWithValueSchema,
} from "../schemas/tx-overrides.js";

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
      gasPrice: maybeBigInt(overrides.gasPrice),
      maxFeePerGas: maybeBigInt(overrides.maxFeePerGas),
      maxPriorityFeePerGas: maybeBigInt(overrides.maxPriorityFeePerGas),
    },
    timeoutSeconds: overrides.timeoutSeconds,
    // `value` may not be in the overrides object.
    value: "value" in overrides ? maybeBigInt(overrides.value) : undefined,
  };
};
