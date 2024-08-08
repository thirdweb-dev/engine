import { ethers } from "ethers";
import { getChainMetadata } from "thirdweb/chains";
import { getChain } from "./chain";
import { isEthersErrorCode } from "./ethers";
import { doSimulateTransaction } from "./transaction/simulateQueuedTransaction";
import { AnyTransaction } from "./transaction/types";

export const prettifyError = async (
  transaction: AnyTransaction,
  error: Error,
): Promise<string> => {
  if (!transaction.isUserOp) {
    if (isEthersErrorCode(error, ethers.errors.INSUFFICIENT_FUNDS)) {
      const chain = await getChain(transaction.chainId);
      const metadata = await getChainMetadata(chain);
      return `Insufficient ${metadata.nativeCurrency?.symbol} on ${metadata.name} in ${transaction.from}.`;
    }

    if (isEthersErrorCode(error, ethers.errors.UNPREDICTABLE_GAS_LIMIT)) {
      const simulateError = await doSimulateTransaction(transaction);
      if (simulateError) {
        return simulateError;
      }
    }
  }

  return error.message;
};

export const isNonceAlreadyUsedError = (error: unknown) =>
  (error instanceof Error &&
    error.message.toLowerCase().includes("nonce too low")) ||
  isEthersErrorCode(error, ethers.errors.NONCE_EXPIRED);

export const isReplacementGasFeeTooLow = (error: unknown) =>
  (error instanceof Error &&
    error.message.toLowerCase().includes("replacement fee too low")) ||
  isEthersErrorCode(error, ethers.errors.REPLACEMENT_UNDERPRICED);
