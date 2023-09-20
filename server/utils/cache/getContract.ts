import { getSdk } from "./getSdk";

interface GetContractParams {
  chainId: number;
  walletAddress?: string;
  contractAddress: string;
}

export const getContract = async ({
  chainId,
  walletAddress,
  contractAddress,
}: GetContractParams) => {
  const sdk = await getSdk({ chainId, walletAddress });

  // We don't need to maintain cache for contracts because sdk handles it already
  return sdk.getContract(contractAddress);
};
