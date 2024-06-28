import { Address, defineChain, prepareTransaction } from "thirdweb";
import { estimateGasCost } from "thirdweb/transaction";
import { getWalletBalance } from "thirdweb/wallets";
import { thirdwebClient } from "../../utils/sdk";

interface GetWithdrawValueParams {
  chainId: number;
  from: Address;
  to: Address;
}

export const getWithdrawValue = async ({
  chainId,
  from,
  to,
}: GetWithdrawValueParams): Promise<bigint> => {
  const chain = defineChain(chainId);

  // Get wallet balance.
  const { value: balanceWei } = await getWalletBalance({
    address: from,
    client: thirdwebClient,
    chain,
  });

  // Estimate gas for a transfer.
  const transaction = prepareTransaction({
    value: BigInt(1),
    to,
    chain,
    client: thirdwebClient,
  });
  const { wei: transferCostWei } = await estimateGasCost({ transaction });

  // Add a 20% buffer for gas variance.
  const buffer = BigInt(Math.round(Number(transferCostWei) * 0.2));

  return balanceWei - transferCostWei - buffer;
};
