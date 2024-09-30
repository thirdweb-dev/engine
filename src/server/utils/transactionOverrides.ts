import type { Static } from "@sinclair/typebox";
import { maybeBigInt } from "../../utils/primitiveTypes";
import type { txOverridesSchema } from "../schemas/txOverrides";

export const parseTransactionOverrides = (
  overrides: Static<typeof txOverridesSchema>["txOverrides"],
) => {
  if (!overrides) {
    return {};
  }
  return {
    overrides: {
      maxFeePerGas: maybeBigInt(overrides.maxFeePerGas),
    },
    gas: maybeBigInt(overrides.gas),
    maxPriorityFeePerGas: maybeBigInt(overrides.maxPriorityFeePerGas),
    timeoutSeconds: overrides.timeoutSeconds,
  };
};
