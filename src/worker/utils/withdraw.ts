import { defineChain, estimateGas, prepareTransaction } from "thirdweb";
import { ethers5Adapter } from "thirdweb/adapters/ethers5";
import { getWalletBalance } from "thirdweb/wallets";
import { getWallet } from "../../utils/cache/getWallet";
import { thirdwebClient } from "../../utils/sdk";

interface GetWithdrawValueParams {
  chainId: number;
  fromAddress: string;
  toAddress: string;
}

export const getWithdrawValue = async ({
  chainId,
  fromAddress,
  toAddress,
}: GetWithdrawValueParams): Promise<bigint> => {
  const chain = defineChain(chainId);

  // Get wallet balance.
  const wallet = await getWallet({ chainId, walletAddress: fromAddress });
  const account = await ethers5Adapter.signer.fromEthers(wallet.getSigner());
  const balance = await getWalletBalance({
    account,
    client: thirdwebClient,
    chain,
  });

  // Estimate gas for a transfer.
  const transferTx = prepareTransaction({
    value: BigInt(balance.toString()),
    to: toAddress,
    chain,
    client: thirdwebClient,
  });
  const transferCostGwei = await estimateGas({ transaction: transferTx });
  // Convert to wei and add 20% buffer to account for variance.
  const transferCostWei = transferCostGwei * BigInt(1.2 * 10 ** 9);

  return balance.value - transferCostWei;
};
