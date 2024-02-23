import { Chain, getContract } from "thirdweb";
import { client } from "./getClient";

interface GetContractParams {
  chain: Chain;
  contractAddress: string;
}

export const getContractUsingNew = async ({
  chain,
  contractAddress,
}: GetContractParams) => {
  // get a contract
  const contract = getContract({
    // the client you have created via `createThirdwebClient()`
    client,
    // the contract's address
    address: contractAddress,
    // the chain the contract is deployed on
    chain,
  });
  return contract;
};
