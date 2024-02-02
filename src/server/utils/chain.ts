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
export const getChainIdFromChain = async (input: string): Promise<number> => {
  const inputSlug = input.toLowerCase();
  // inputId may be NaN if a slug is provided ('Polygon').
  const inputId = parseInt(input);

  const config = await getConfig();

  // Check if the chain ID exists in chainOverrides first.
  if (config.chainOverrides) {
    try {
      const parsedChainOverrides: Static<typeof networkResponseSchema>[] =
        JSON.parse(config.chainOverrides);

      for (const chainData of parsedChainOverrides) {
        if (
          inputSlug === chainData.slug.toLowerCase() ||
          inputId === chainData.chainId
        ) {
          return chainData.chainId;
        }
      }
    } catch (e) {
      logger({
        service: "server",
        level: "error",
        message: `Failed parsing chainOverrides: ${e}`,
      });
    }
  }

  if (!isNaN(inputId)) {
    // Fetch by chain ID.
    const chainData = await getChainByChainIdAsync(inputId);
    if (chainData) {
      return chainData.chainId;
    }
  } else {
    // Fetch by chain name.
    const chainData = await getChainBySlugAsync(inputSlug);
    if (chainData) {
      return chainData.chainId;
    }
  }

  throw new Error(
    `Invalid chain. Please confirm this is a valid chain: https://thirdweb.com/${input}`,
  );
};
