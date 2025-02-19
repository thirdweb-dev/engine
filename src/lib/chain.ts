import { defineChain, type Chain } from "thirdweb";
import { config } from "./config";

/**
 * Get the chain for thirdweb v5 SDK. Supports chain overrides.
 * @param chainId
 * @returns Chain
 */
export const getChain = async (chainId: number): Promise<Chain> => {
  for (const override of config.chainOverrides) {
    if (chainId === override.id) {
      // we need to call defineChain to ensure that the chain is registered in CUSTOM_CHAIN_MAP
      // even if we have a Chain type, we need to call defineChain to ensure that the chain is registered
      return defineChain(override);
    }
  }

  return defineChain(chainId);
};
