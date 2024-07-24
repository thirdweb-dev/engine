import { ethers } from "ethers";
import { getChainMetadata } from "thirdweb/chains";
import { getChain } from "./chain";
import { EthersError } from "./ethers";
import { simulateQueuedTransaction } from "./transaction/simulateQueuedTransaction";
import { AnyTransaction } from "./transaction/types";

export const prettifyError = async (
  transaction: AnyTransaction,
  error: Error,
): Promise<string> => {
  if (!transaction.isUserOp) {
    if (
      (error as unknown as EthersError)?.code ===
      ethers.errors.INSUFFICIENT_FUNDS
    ) {
      const chain = await getChain(transaction.chainId);
      const metadata = await getChainMetadata(chain);
      return `Insufficient ${metadata.nativeCurrency?.symbol} on ${metadata.name} in ${transaction.from}.`;
    }

    if (
      (error as unknown as EthersError)?.code ===
      ethers.errors.UNPREDICTABLE_GAS_LIMIT
    ) {
      const simulateError = await simulateQueuedTransaction(transaction);
      if (simulateError) {
        return simulateError;
      }
    }
  }

  return error.message;
};
