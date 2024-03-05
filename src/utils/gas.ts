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
  return gasOverrides.gasPrice
    ? {
        gasPrice: multiplyBN(gasOverrides.gasPrice, mul),
      }
    : {
        maxFeePerGas: multiplyBN(gasOverrides.maxFeePerGas, mul),
        maxPriorityFeePerGas: multiplyBN(
          gasOverrides.maxPriorityFeePerGas,
          mul,
        ),
      };
};

const multiplyBN = (n: BigNumber, mul: number): BigNumber =>
  Number.isInteger(mul) ? n.mul(mul) : n.mul(mul * 10_000).div(10_000);
