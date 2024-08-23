import { Chain, defineChain } from "thirdweb";
import { getConfig } from "./cache/getConfig";

/**
 * Get the chain for thirdweb v5 SDK. Supports chain overrides.
 * @param chainId
 * @returns Chain
 */
export const getChain = async (chainId: number): Promise<Chain> => {
  const config = await getConfig();

  for (const override of config.chainOverridesParsed) {
    if (chainId === override.id) {
      return override;
    }
  }

  return defineChain(chainId);
};
