import type { Transactions } from ".prisma/client";
import { getDefaultGasOverrides } from "@thirdweb-dev/sdk";
import { BigNumber, providers } from "ethers";
import { maxBN } from "./bigNumber";

type gasOverridesReturnType = Awaited<
  ReturnType<typeof getDefaultGasOverrides>
>;

/**
 *
 * @param tx
 * @param provider
 * @returns
 */
export const getGasSettingsForRetry = async (
  tx: Transactions,
  provider: providers.StaticJsonRpcProvider,
): Promise<gasOverridesReturnType> => {
  // Default: Use 2x gas settings from chain.
  const defaultGasOverrides = multiplyGasOverrides(
    await getDefaultGasOverrides(provider),
    2,
  );

  // Handle legacy gas format.
  if (defaultGasOverrides.gasPrice) {
    // Gas settings must be 10% higher than a previous attempt.
    return {
      gasPrice: maxBN(
        defaultGasOverrides.gasPrice,
        BigNumber.from(tx.gasPrice!).mul(110).div(100),
      ),
    };
  }

  // Handle EIP 1559 gas format.
  if (tx.retryGasValues) {
    // If this tx is manually retried, override with provided gas settings.
    defaultGasOverrides.maxFeePerGas = BigNumber.from(tx.retryMaxFeePerGas!);
    defaultGasOverrides.maxPriorityFeePerGas = BigNumber.from(
      tx.retryMaxPriorityFeePerGas!,
    );
  }

  // Gas settings must be 10% higher than a previous attempt.
  return {
    maxFeePerGas: maxBN(
      defaultGasOverrides.maxFeePerGas,
      BigNumber.from(tx.maxFeePerGas!).mul(110).div(100),
    ),
    maxPriorityFeePerGas: maxBN(
      defaultGasOverrides.maxPriorityFeePerGas,
      BigNumber.from(tx.maxPriorityFeePerGas!).mul(110).div(100),
    ),
  };
};

export const multiplyGasOverrides = (
  gasOverrides: gasOverridesReturnType,
  mul: number,
): gasOverridesReturnType => {
  const mulBN = Number.isInteger(mul)
    ? BigNumber.from(mul)
    : BigNumber.from(mul * 10_000).div(10_000);

  return gasOverrides.gasPrice
    ? {
        gasPrice: gasOverrides.gasPrice.mul(mulBN),
      }
    : {
        maxFeePerGas: gasOverrides.maxFeePerGas.mul(mulBN),
        maxPriorityFeePerGas: gasOverrides.maxPriorityFeePerGas.mul(mulBN),
      };
};
