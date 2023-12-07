import { asL2Provider } from "@eth-optimism/sdk";
import { Base, Optimism, Zora } from "@thirdweb-dev/chains";
import { getDefaultGasOverrides, toUnits } from "@thirdweb-dev/sdk";
import { BigNumber, ethers } from "ethers";

interface GetWithdrawalValueParams {
  provider: ethers.providers.Provider;
  chainId: number;
  fromAddress: string;
  toAddress: string;
  gasOverrides: Awaited<ReturnType<typeof getDefaultGasOverrides>>;
}

export const getWithdrawalValue = async ({
  provider,
  chainId,
  fromAddress,
  toAddress,
  gasOverrides,
}: GetWithdrawalValueParams): Promise<BigNumber> => {
  const balance = await provider.getBalance(fromAddress);

  let transferCost = BigNumber.from(
    gasOverrides.maxFeePerGas || gasOverrides.gasPrice || toUnits(1, 9),
  ).mul(21000);

  if (
    chainId === Base.chainId ||
    chainId === Optimism.chainId ||
    chainId === Zora.chainId
  ) {
    const l2Provider = asL2Provider(provider);
    transferCost = await l2Provider.estimateTotalGasCost({
      to: toAddress,
      value: 1,
    });
  }

  transferCost = transferCost.mul(120).div(100); // +20% in all cases for safety
  return BigNumber.from(balance).sub(transferCost);
};
