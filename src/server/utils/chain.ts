import { Static } from "@sinclair/typebox";
import {
  getChainByChainIdAsync,
  getChainBySlugAsync,
} from "@thirdweb-dev/chains";
import { getConfig } from "../../utils/cache/getConfig";
import { networkResponseSchema } from "../../utils/cache/getSdk";
import { logger } from "../../utils/logger";

/**
 * Given a valid chain name ('Polygon') or ID ('137'), return the numeric chain ID.
 */
export const getChainIdFromChain = async (chain: string): Promise<number> => {
  const config = await getConfig();

  // Check if the chain ID exists in chainOverrides first.
  if (config.chainOverrides) {
    try {
      const parsedChainOverrides = JSON.parse(config.chainOverrides);
      const chainData: Static<typeof networkResponseSchema> | undefined =
        parsedChainOverrides.find(
          (chainData: Static<typeof networkResponseSchema>) =>
            chainData.slug === chain,
        );
      if (chainData) {
        return chainData.chainId;
      }
    } catch (e) {
      logger({
        service: "server",
        level: "error",
        message: `Failed parsing chainOverrides: ${e}`,
      });
    }
  }

  if (!isNaN(parseInt(chain))) {
    // Fetch by chain ID.
    const chainData = await getChainByChainIdAsync(parseInt(chain));
    if (chainData) {
      return chainData.chainId;
    }
  } else {
    // Fetch by chain name.
    const chainData = await getChainBySlugAsync(chain);
    if (chainData) {
      return chainData.chainId;
    }
  }

  throw new Error(
    `Invalid chain. Please confirm this is a valid chain: https://thirdweb.com/${chain}`,
  );
};
