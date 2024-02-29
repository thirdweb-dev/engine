import { Chain, defineChain, getContract } from "thirdweb";
import { client } from "./getClient";

interface GetContractParams {
  chainId: number;
  contractAddress: string;
}

export const definedChainCache = new Map<number, Chain>(); // This is a cache

// Using new v5 SDK
export const getContractV5 = async ({
  chainId,
  contractAddress,
}: GetContractParams) => {
  const cachedChainData = definedChainCache.get(chainId);

  if (cachedChainData) {
    return getContract({
      client,
      address: contractAddress,
      chain: cachedChainData,
    });
  }
  const definedChain = defineChain(chainId);
  definedChainCache.set(chainId, definedChain);

  // get a contract
  return getContract({
    // the client you have created via `createThirdwebClient()`
    client,
    // the contract's address
    address: contractAddress,
    // the chain the contract is deployed on
    chain: definedChain,
  });
};
