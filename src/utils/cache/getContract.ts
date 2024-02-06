import { ContractInterface } from "ethers";
import { getSdk } from "./getSdk";

interface GetContractParams {
  chainId: number;
  walletAddress?: string;
  accountAddress?: string;
  contractAddress: string;
  abi?: ContractInterface;
}

export const getContract = async ({
  chainId,
  walletAddress,
  contractAddress,
  accountAddress,
  abi,
}: GetContractParams) => {
  const sdk = await getSdk({ chainId, walletAddress, accountAddress });

  // We don't need to maintain cache for contracts because sdk handles it already
  return abi
    ? sdk.getContract(contractAddress, abi)
    : sdk.getContract(contractAddress);
};
