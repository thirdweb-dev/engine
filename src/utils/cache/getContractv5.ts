import { getContract } from "thirdweb";
import { thirdwebClient } from "../../utils/sdk";
import { getChain } from "../chain";

interface GetContractParams {
  chainId: number;
  contractAddress: string;
  abi?: any;
}

// Using new v5 SDK
export const getContractV5 = async ({
  chainId,
  contractAddress,
  abi,
}: GetContractParams) => {
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
  });
};
