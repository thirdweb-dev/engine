import { defineChain, prepareTransaction } from "thirdweb";
import { ethers5Adapter } from "thirdweb/adapters/ethers5";
import { estimateGasCost } from "thirdweb/transaction";
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
  const signer = await wallet.getSigner();
  const account = await ethers5Adapter.signer.fromEthers(signer);
  const { value: balanceWei } = await getWalletBalance({
    account,
    client: thirdwebClient,
    chain,
  });

  try {
    // Estimate gas for a transfer.
    const transferTx = prepareTransaction({
      value: BigInt(1),
      to: toAddress,
      chain,
      client: thirdwebClient,
    });
    const { wei: transferCostWei } = await estimateGasCost({
      transaction: transferTx,
    });

    // Add a 20% buffer for gas variance.
    const buffer = BigInt(Math.round(Number(transferCostWei) * 0.2));

    return balanceWei - transferCostWei - buffer;
  } catch (e) {
    console.error(e);
  }
};
