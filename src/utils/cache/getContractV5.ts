import { ContractOptions, defineChain, getContract } from "thirdweb";
import { thirdwebClient } from "../sdk";

interface GetContractParams {
  chainId: number;
  contractAddress: string;
}

// export const definedChainCache = new Map<number, Chain>(); // This is a cache
export const contractCache = new Map<string, ContractOptions<[]>>(); // This is a cache

// Using new v5 SDK
export const getContractV5 = ({
  chainId,
  contractAddress,
}: GetContractParams) => {
  const definedChain = defineChain(chainId);
  const cacheKey = `${definedChain.id}-${contractAddress}`;
  const cachedContractData = contractCache.get(cacheKey);

  if (cachedContractData) {
    return cachedContractData;
  }

  // get a contract
  return getContract({
    // the client you have created via `createThirdwebClient()`
    client: thirdwebClient,
    // the contract's address
    address: contractAddress,
    // the chain the contract is deployed on
    chain: definedChain,
  });
};
