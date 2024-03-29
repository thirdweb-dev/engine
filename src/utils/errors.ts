import { Transactions } from ".prisma/client";
import { getChainByChainIdAsync } from "@thirdweb-dev/chains";
import { ethers } from "ethers";
import { prepareTransaction, simulateTransaction } from "thirdweb";
import { thirdwebClient } from "./sdk";

interface EthersError {
  reason: string;
  code: string;
  error: any;
  method: string;
  transaction: any;
}

export const parseTxError = async (
  tx: Transactions,
  err: any,
): Promise<string> => {
  if (!err) {
    return "Unexpected error.";
  }

  // EOA transactions
  if (tx.toAddress && tx.fromAddress && tx.data) {
    const chain = await getChainByChainIdAsync(Number(tx.chainId));

    if ((err as EthersError)?.code === ethers.errors.INSUFFICIENT_FUNDS) {
      return `Insufficient ${chain.nativeCurrency?.symbol} on ${chain.name} in backend wallet ${tx.fromAddress}.`;
    }

    if ((err as EthersError)?.code === ethers.errors.UNPREDICTABLE_GAS_LIMIT) {
      try {
        const transaction = prepareTransaction({
          to: tx.toAddress,
          value: BigInt(tx.value || "0"),
          data: tx.data as `0x${string}`,
          chain: {
            id: Number(tx.chainId),
            rpc: chain.rpc[0],
          },
          client: thirdwebClient,
        });
        await simulateTransaction({ transaction, from: tx.fromAddress });
      } catch (simErr: any) {
        return simErr?.message ?? simErr.toString();
      }
    }
  }

  if ("message" in err) {
    return err.message;
  }
  return err.toString();
};
