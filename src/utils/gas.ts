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
    const minGasOverrides = multiplyGasOverrides(
      {
        gasPrice: BigNumber.from(tx.gasPrice),
      },
      1.1,
    );
    return {
      gasPrice: maxBN(defaultGasOverrides.gasPrice, minGasOverrides.gasPrice),
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
  const minGasOverrides = multiplyGasOverrides(
    {
      maxFeePerGas: BigNumber.from(tx.maxFeePerGas!),
      maxPriorityFeePerGas: BigNumber.from(tx.maxPriorityFeePerGas!),
    },
    1.1,
  );
  return {
    maxFeePerGas: maxBN(
      defaultGasOverrides.maxFeePerGas,
      minGasOverrides.maxFeePerGas,
    ),
    maxPriorityFeePerGas: maxBN(
      defaultGasOverrides.maxPriorityFeePerGas,
      minGasOverrides.maxPriorityFeePerGas,
    ),
  };
};

export const multiplyGasOverrides = <T extends gasOverridesReturnType>(
  gasOverrides: T,
  mul: number,
): T => {
  if (gasOverrides.gasPrice) {
    return {
      gasPrice: multiplyBN(gasOverrides.gasPrice, mul),
    } as T;
  }
  return {
    maxFeePerGas: multiplyBN(gasOverrides.maxFeePerGas, mul),
    maxPriorityFeePerGas: multiplyBN(gasOverrides.maxPriorityFeePerGas, mul),
  } as T;
};

const multiplyBN = (n: BigNumber, mul: number): BigNumber =>
  Number.isInteger(mul) ? n.mul(mul) : n.mul(mul * 10_000).div(10_000);
