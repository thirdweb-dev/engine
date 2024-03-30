import { Transactions } from ".prisma/client";
import { getChainByChainIdAsync } from "@thirdweb-dev/chains";
import { ethers } from "ethers";
import { simulateRaw } from "../server/utils/simulateTx";

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
  if ((err as EthersError)?.code === ethers.errors.INSUFFICIENT_FUNDS) {
    const chain = await getChainByChainIdAsync(Number(tx.chainId));
    return `Insufficient ${chain.nativeCurrency?.symbol} on ${chain.name} in backend wallet ${tx.fromAddress}.`;
  }

  if ((err as EthersError)?.code === ethers.errors.UNPREDICTABLE_GAS_LIMIT) {
    try {
      await simulateRaw({
        chainId: tx.chainId,
        fromAddress: tx.fromAddress ?? undefined,
        toAddress: tx.toAddress ?? undefined,
        data: tx.data ?? "0x",
        value: tx.value ?? undefined,
      });
    } catch (simulationErr: any) {
      return simulationErr.toString();
    }
  }

  if ("message" in err) {
    return err.message;
  }
  return err.toString();
};
