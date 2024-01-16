import { Static } from "@sinclair/typebox";
import { allChains, getChainByChainIdAsync } from "@thirdweb-dev/chains";
import { getConfig } from "../../utils/cache/getConfig";
import { networkResponseSchema } from "../../utils/cache/getSdk";

const ChainNameToChainId = {
  ...allChains.reduce((acc, chain) => {
    acc[chain.slug] = chain.chainId;
    return acc;
  }, {} as Record<string, number>),
} as Record<string, number>;

// TODO: We should use a universal name - probably chain in the routes
export const getChainIdFromChain = async (chain: string): Promise<number> => {
  let chainId: number | undefined = undefined;
  let chainData: Static<typeof networkResponseSchema> | undefined = undefined;

  // If we detect a valid chain name, use the corresponding chain id
  if (chain in ChainNameToChainId) {
    chainId = ChainNameToChainId[chain as keyof typeof ChainNameToChainId];
  }

  const config = await getConfig();

  // If we're passed a valid chain id directly, then use it
  if (!isNaN(parseInt(chain))) {
    const unknownChainId = parseInt(chain);
    try {
      const chain = await getChainByChainIdAsync(unknownChainId);
      // If the chain id is for a supported chain, use the chain id
      if (chain) {
        chainId = unknownChainId;
      }
    } catch {
      if (!chainId) {
        if (config?.chainOverrides) {
          const parsedChainOverrides = JSON.parse(config.chainOverrides);
          chainData = parsedChainOverrides.find(
            (chainData: Static<typeof networkResponseSchema>) =>
              chainData.chainId === unknownChainId,
          );
        }
      }
      // If the chain id is unsupported, getChainByChainIdAsync will throw
    }
  } else {
    if (config?.chainOverrides) {
      const parsedChainOverrides = JSON.parse(config.chainOverrides);
      chainData = parsedChainOverrides.find(
        (chainData: Static<typeof networkResponseSchema>) =>
          chainData.slug === chain,
      );
    }
  }

  if (chainData) {
    chainId = chainData.chainId;
  }

  if (!chainId) {
    // TODO: Custom error messages
    throw new Error(`Invalid chain ${chain}, please use a different value.`);
  }

  return chainId;
};
