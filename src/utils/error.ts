import { ethers } from "ethers";
import { stringify } from "thirdweb/utils";
import { isEthersErrorCode } from "./ethers";

export const wrapError = (error: unknown, prefix: "RPC" | "Bundler") =>
  new Error(`[${prefix}] ${prettifyError(error)}`);

export const prettifyError = (error: unknown): string =>
  error instanceof Error ? error.message : stringify(error);

const _parseMessage = (error: unknown): string | null => {
  return error && typeof error === "object" && "message" in error
    ? (error.message as string).toLowerCase()
    : null;
};

export const isNonceAlreadyUsedError = (error: unknown) => {
  const message = _parseMessage(error);
  if (message) {
    return (
      message.includes("nonce too low") || message.includes("already known")
    );
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

export const isInsufficientFundsError = (error: unknown) => {
  const message = _parseMessage(error);
  if (message) {
    return (
      message.includes("insufficient funds for gas * price + value") ||
      message.includes("insufficient funds for intrinsic transaction cost")
    );
  }
  return isEthersErrorCode(error, ethers.errors.INSUFFICIENT_FUNDS);
};
