import { BigNumberish, providers } from "ethers";

export const getWalletNonce = async (
  walletAddress: string,
  provider: providers.Provider,
): Promise<BigNumberish> => {
  try {
    const txCount = await provider.getTransactionCount(
      walletAddress,
      "pending",
    );
    return txCount;
  } catch (error) {
    throw error;
  }
};

const getRPCURL = async (chainId: string): Promise<string> => {
  return `https://${chainId}.rpc.thirdweb.com`;
};
