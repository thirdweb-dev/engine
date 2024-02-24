import type { Transactions } from ".prisma/client";
import { getDefaultGasOverrides } from "@thirdweb-dev/sdk";
import { BigNumber, providers } from "ethers";
import { maxBN } from "./bigNumber";

/**
 *
 * @param tx
 * @param provider
 * @returns
 */
export const getGasSettingsForRetry = async (
  tx: Transactions,
  provider: providers.StaticJsonRpcProvider,
): ReturnType<typeof getDefaultGasOverrides> => {
  // Default: get gas settings from chain.
  const { gasPrice, maxFeePerGas, maxPriorityFeePerGas } =
    await getDefaultGasOverrides(provider);

  // Handle legacy gas format.
  if (gasPrice) {
    const newGasPrice = gasPrice.mul(2);
    // Gas settings must be 10% higher than a previous attempt.
    const minGasPrice = BigNumber.from(tx.gasPrice!).mul(110).div(100);

    return {
      gasPrice: maxBN(newGasPrice, minGasPrice),
    };
  }

  // Handle EIP 1559 gas format.
  let newMaxFeePerGas = maxFeePerGas.mul(2);
  let newMaxPriorityFeePerGas = maxPriorityFeePerGas.mul(2);

  if (tx.retryGasValues) {
    // If this tx is manually retried, override with provided gas settings.
    newMaxFeePerGas = BigNumber.from(tx.retryMaxFeePerGas!);
    newMaxPriorityFeePerGas = BigNumber.from(tx.retryMaxPriorityFeePerGas!);
  }

  // Gas settings muset be 10% higher than a previous attempt.
  const minMaxFeePerGas = BigNumber.from(tx.maxFeePerGas!).mul(110).div(100);
  const minMaxPriorityFeePerGas = BigNumber.from(tx.maxPriorityFeePerGas!)
    .mul(110)
    .div(100);

  return {
    maxFeePerGas: maxBN(newMaxFeePerGas, minMaxFeePerGas),
    maxPriorityFeePerGas: maxBN(
      newMaxPriorityFeePerGas,
      minMaxPriorityFeePerGas,
    ),
  };
};
