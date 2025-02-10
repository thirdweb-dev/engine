import { type ThirdwebContract, getContract } from "thirdweb";
import type { Abi } from "thirdweb/utils";
import { thirdwebClient } from "../sdk.js";
import { getChain } from "../chain.js";

interface GetContractParams {
  chainId: number;
  contractAddress: string;
  abi?: Abi;
}

// Using new v5 SDK
export const getContractV5 = async ({
  chainId,
  contractAddress,
  abi,
}: GetContractParams): Promise<ThirdwebContract> => {
  const definedChain = await getChain(chainId);

  // get a contract
  return getContract({
    // the client you have created via `createThirdwebClient()`
    client: thirdwebClient,
    // the contract's address
    address: contractAddress,
    // the chain the contract is deployed on
    chain: definedChain,
    abi,
  }) as ThirdwebContract; // not using type inference here;
};
