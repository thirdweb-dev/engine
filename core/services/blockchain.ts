import { BigNumberish, providers } from "ethers";
import { formatUnits } from "ethers/lib/utils";

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
    for (const key in feeData) {
      console.log(
        key,
        formatUnits(feeData[key as keyof typeof feeData] ?? "0", "gwei"),
        " gwei",
      );
    }

    return feeData;
  } catch (error) {
    throw error;
  }
};
