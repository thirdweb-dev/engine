import { Static } from "@sinclair/typebox";
import {
  txOverridesSchema,
  txOverridesWithValueSchema,
} from "../server/schemas/txOverrides";
import { maybeBigInt } from "./primitiveTypes";

export const DEFAULT_TIMEOUT_SECONDS_IF_ENFORCED = 24 * 60 * 60; // 24 hours

export const parseTxOverrides = (
  txOverrides?: Static<typeof txOverridesSchema>,
): {
  gas?: bigint;
  maxFeePerGas?: bigint;
  maxPriorityFeePerGas?: bigint;
  deadline?: Date;
  isFixedGasFees: boolean;
} => {
  if (!txOverrides) {
    return { isFixedGasFees: false };
  }

  // Set the deadline to `timeoutSeconds` in the future.
  // Enforce a default deadline if gas fees are fixed.
  let deadline: Date | undefined;
  if (txOverrides.timeoutSeconds) {
    deadline = new Date(Date.now() + txOverrides.timeoutSeconds * 1000);
  }
  const isFixedGasFees = txOverrides.maxFeePerGas !== undefined;
  if (isFixedGasFees && !deadline) {
    deadline = new Date(
      Date.now() + DEFAULT_TIMEOUT_SECONDS_IF_ENFORCED * 1000,
    );
  }

  return {
    gas: maybeBigInt(txOverrides.gas),
    maxFeePerGas: maybeBigInt(txOverrides.maxFeePerGas),
    maxPriorityFeePerGas: maybeBigInt(txOverrides.maxPriorityFeePerGas),
    deadline,
    isFixedGasFees,
  };
};

export const parseTxOverridesWithValue = (
  txOverrides?: Static<typeof txOverridesWithValueSchema>,
): {
  gas?: bigint;
  maxFeePerGas?: bigint;
  maxPriorityFeePerGas?: bigint;
  deadline?: Date;
  isFixedGasFees: boolean;
  value: bigint;
} => {
  const result = parseTxOverrides(txOverrides);
  return {
    ...result,
    value: maybeBigInt(txOverrides?.value) ?? 0n,
  };
};
