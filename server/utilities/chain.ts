import { allChains, getChainByChainId } from "@thirdweb-dev/chains";

const ChainNameToChainId = {
  ...allChains.reduce((acc, chain) => {
    acc[chain.slug] = chain.chainId;
    return acc;
  }, {} as Record<string, number>),
} as Record<string, number>;

// TODO: We should use a universal name - probably chain in the routes
export const getChainIdFromChain = (chain: string): number => {
  let chainId: number | undefined = undefined;

  // If we detect a valid chain name, use the corresponding chain id
  if (chain in ChainNameToChainId) {
    chainId = ChainNameToChainId[chain as keyof typeof ChainNameToChainId];
  }

  // If we're passed a valid chain id directly, then use it
  if (!isNaN(parseInt(chain))) {
    const unknownChainId = parseInt(chain);
    try {
      // If the chain id is for a supported chain, use the chain id
      if (getChainByChainId(unknownChainId)) {
        chainId = unknownChainId;
      }
    } catch {
      // If the chain id is unsupported, getChainByChainId will throw
    }
  }

  if (!chainId) {
    // TODO: Custom error messages
    throw new Error(`Invalid chain ${chain}, please use a different value.`);
  }

  return chainId;
};
