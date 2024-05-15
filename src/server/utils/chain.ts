import { Static } from "@sinclair/typebox";
import {
  getChainByChainIdAsync,
  getChainBySlugAsync,
} from "@thirdweb-dev/chains";
import { StatusCodes } from "http-status-codes";
import { getConfig } from "../../utils/cache/getConfig";
import { networkResponseSchema } from "../../utils/cache/getSdk";
import { logger } from "../../utils/logger";
import { createCustomError } from "../middleware/error";

/**
 * Given a valid chain name ('Polygon') or ID ('137'), return the numeric chain ID.
 *
 * @throws if the chain is invalid or deprecated.
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

  // Fetch by chain ID or slug.
  // Throw if the chain is invalid or deprecated.
  try {
    const chain = !isNaN(inputId)
      ? await getChainByChainIdAsync(inputId)
      : await getChainBySlugAsync(inputSlug);

    if (chain.status === "deprecated") {
      throw createCustomError(
        `Chain ${input} is deprecated`,
        StatusCodes.BAD_REQUEST,
        "INVALID_CHAIN",
      );
    }

    return chain.chainId;
  } catch (e) {
    throw createCustomError(
      `Chain ${input} is not found`,
      StatusCodes.BAD_REQUEST,
      "INVALID_CHAIN",
    );
  }
};
