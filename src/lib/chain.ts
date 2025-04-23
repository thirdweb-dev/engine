import { defineChain, type Chain } from "thirdweb";
import { config } from "./config.js";
import { Result } from "neverthrow";
import type { ValidationErr } from "./errors.js";

/**
 * Get the chain for thirdweb v5 SDK. Supports chain overrides.
 * @param chainId
 * @returns Chain
 */
export const getChain = (chainId: number): Chain => {
  for (const override of config.chainOverrides) {
    if (chainId === override.id) {
      // we need to call defineChain to ensure that the chain is registered in CUSTOM_CHAIN_MAP
      // even if we have a Chain type, we need to call defineChain to ensure that the chain is registered
      return defineChain(override);
    }
  }

  return defineChain(chainId);
};

export const getChainResult = Result.fromThrowable(
  (chainId: string) => {
    const chainIdNumber = Number.parseInt(chainId);
    return getChain(chainIdNumber);
  },
  () =>
    ({
      code: "parse_error",
      kind: "validation",
      status: 400,
      message: `Invalid chain ID: could not parse to number`,
    }) satisfies ValidationErr as ValidationErr,
);
