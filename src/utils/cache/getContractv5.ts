import { defineChain, getContract } from "thirdweb";
import { thirdwebClient } from "../../utils/sdk";

interface GetContractParams {
  chainId: number;
  contractAddress: string;
  abi?: any;
}

// Using new v5 SDK
export const getContractV5 = ({
  chainId,
  contractAddress,
  abi,
}: GetContractParams) => {
  const definedChain = defineChain(chainId);

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
