import type { Transactions } from ".prisma/client";
import { getDefaultGasOverrides } from "@thirdweb-dev/sdk";
import { BigNumber, providers } from "ethers";

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
    const newGasPrice = Math.max(
      gasPrice.toNumber() * 2,
      // Gas settings must be 10% higher than a previous attempt.
      parseFloat(tx.gasPrice!) * 1.1,
    );
    return {
      gasPrice: BigNumber.from(newGasPrice),
    };
  }

  // Handle EIP 1559 gas format.
  // Gas settings must be 10% higher than a previous attempt.
  let newMaxFeePerGas = Math.max(
    maxFeePerGas.toNumber() * 2,
    parseFloat(tx.maxFeePerGas!) * 1.1,
  );
  let newMaxPriorityFeePerGas = Math.max(
    maxPriorityFeePerGas.toNumber() * 2,
    parseFloat(tx.maxPriorityFeePerGas!) * 1.1,
  );

  // If manually retried, override with provided gas settings.
  if (tx.retryGasValues) {
    newMaxFeePerGas = parseInt(tx.retryMaxFeePerGas!);
    newMaxPriorityFeePerGas = parseInt(tx.maxPriorityFeePerGas!);
  }

  return {
    maxFeePerGas: BigNumber.from(newMaxFeePerGas),
    maxPriorityFeePerGas: BigNumber.from(newMaxPriorityFeePerGas),
  };
};
