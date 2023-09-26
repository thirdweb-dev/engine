import { getSdk } from "./getSdk";

interface GetContractParams {
  chainId: number;
  walletAddress?: string;
  accountAddress?: string;
  contractAddress: string;
}

export const getContract = async ({
  chainId,
  walletAddress,
  contractAddress,
  accountAddress,
}: GetContractParams) => {
  const sdk = await getSdk({ chainId, walletAddress, accountAddress });

  // We don't need to maintain cache for contracts because sdk handles it already
  return sdk.getContract(contractAddress);
};
