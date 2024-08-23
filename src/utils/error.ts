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

const _parseMessage = (error: unknown): string | null => {
  return error && typeof error === "object" && "message" in error
    ? (error.message as string).toLowerCase()
    : null;
};

export const isNonceAlreadyUsedError = (error: unknown) => {
  const message = _parseMessage(error);
  if (message) {
    return message.includes("nonce too low");
  }
  return isEthersErrorCode(error, ethers.errors.NONCE_EXPIRED);
};

export const isReplacementGasFeeTooLow = (error: unknown) => {
  const message = _parseMessage(error);
  if (message) {
    return (
      message.includes("replacement fee too low") ||
      message.includes("replacement transaction underpriced")
    );
  }
  return isEthersErrorCode(error, ethers.errors.REPLACEMENT_UNDERPRICED);
};
