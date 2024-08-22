import { Static } from "@sinclair/typebox";
import { getChainBySlugAsync } from "@thirdweb-dev/chains";
import { StatusCodes } from "http-status-codes";
import { getConfig } from "../../utils/cache/getConfig";
import { networkResponseSchema } from "../../utils/cache/getSdk";
import { logger } from "../../utils/logger";
import { createCustomError } from "../middleware/error";

/**
 * Given a valid chain name ('Polygon') or ID ('137'), return the numeric chain ID.
 * @throws if the chain is invalid or deprecated.
 */
export const getChainIdFromChain = async (input: string): Promise<number> => {
  const inputId = parseInt(input);
  if (!isNaN(inputId)) {
    // input is a valid number.
    return inputId;
  }

  // input is non-numeric. Try to resolve the name to the chain ID.
  const slug = input.toLowerCase();
  const config = await getConfig();

  // Check if the chain ID exists in chainOverrides first.
  if (config.chainOverrides) {
    try {
      const parsedChainOverrides: Static<typeof networkResponseSchema>[] =
        JSON.parse(config.chainOverrides);

      for (const chainData of parsedChainOverrides) {
        if (slug === chainData.slug.toLowerCase()) {
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

  // Fetch by slug.
  // Throw if the chain is invalid or deprecated.
  try {
    const chain = await getChainBySlugAsync(slug);
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
