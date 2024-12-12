// import { EthersError } from "@ethersproject/logger";
import { ethers } from "ethers";

// Copied from: https://github.com/ethers-io/ethers.js/blob/main/src.ts/utils/errors.ts#L156
// EthersError in ethers isn't exported.
export interface EthersError extends Error {
  /**
   *  The string error code.
   */
  code: ethers.errors;

  /**
   *  A short message describing the error, with minimal additional
   *  details.
   */
  shortMessage: string;

  /**
   *  Additional info regarding the error that may be useful.
   *
   *  This is generally helpful mostly for human-based debugging.
   */
  info?: Record<string, unknown>;

  /**
   *  Any related error.
   */
  error?: Error;
}

export const ETHERS_ERROR_CODES = new Set(Object.values(ethers.errors));

/**
 * Returns an EthersError, or null if the error is not an ethers error.
 * @param error
 * @returns EthersError | null
 */
export const parseEthersError = (error: unknown): EthersError | null => {
  const isNonNullObject = error && typeof error === "object";
  const hasCodeProperty = isNonNullObject && "code" in error;
  if (hasCodeProperty && ETHERS_ERROR_CODES.has(error.code as ethers.errors)) {
    return error as EthersError;
  }
  return null;
};

export const isEthersErrorCode = (error: unknown, code: ethers.errors) =>
  parseEthersError(error)?.code === code;
