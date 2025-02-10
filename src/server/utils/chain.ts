import { getChainBySlugAsync } from "@thirdweb-dev/chains";
import { getChain } from "../../shared/utils/chain.js";
import { badChainError } from "../middleware/error.js";

/**
 * Given a valid chain name ('Polygon') or ID ('137'), return the numeric chain ID.
 * @throws if the chain is invalid or deprecated.
 */
export const getChainIdFromChain = async (input: string): Promise<number> => {
  const chainId = Number.parseInt(input);
  if (!Number.isNaN(chainId)) {
    return (await getChain(chainId)).id;
  }

  try {
    const chainV4 = await getChainBySlugAsync(input.toLowerCase());
    if (chainV4.status !== "deprecated") {
      return chainV4.chainId;
    }
  } catch {}

  throw badChainError(input);
};
