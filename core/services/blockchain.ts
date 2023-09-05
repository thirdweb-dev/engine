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

export const getFeeData = async (provider: providers.Provider) => {
  try {
    const feeData = await provider.getFeeData();

    return feeData;
  } catch (error) {
    throw error;
  }
};
