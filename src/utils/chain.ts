import { Static } from "@sinclair/typebox";
import { Chain, defineChain } from "thirdweb";
import { getConfig } from "./cache/getConfig";
import { networkResponseSchema } from "./cache/getSdk";

/**
 * Get the chain for thirdweb v5 SDK. Supports chain overrides.
 * @param chainId
 * @returns Chain
 */
export const getChain = async (chainId: number): Promise<Chain> => {
  const config = await getConfig();

  if (config.chainOverrides) {
    const parsedChainOverrides: Static<typeof networkResponseSchema>[] =
      JSON.parse(config.chainOverrides);

    for (const chainData of parsedChainOverrides) {
      if (slug === chainData.slug.toLowerCase()) {
        return chainData.chainId;
      }
    }
  }

  return defineChain(chainId);
};
