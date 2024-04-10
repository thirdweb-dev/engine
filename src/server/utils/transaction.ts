import { getDefaultGasOverrides } from "@thirdweb-dev/sdk";
import { StatusCodes } from "http-status-codes";
import { getTxById } from "../../db/transactions/getTxById";
import { updateTx } from "../../db/transactions/updateTx";
import { PrismaTransaction } from "../../schema/prisma";
import { getSdk } from "../../utils/cache/getSdk";
import { multiplyGasOverrides } from "../../utils/gas";
import { createCustomError } from "../middleware/error";
import { TransactionStatus } from "../schemas/transaction";

interface CancelTransactionAndUpdateParams {
  queueId: string;
  pgtx?: PrismaTransaction;
}

export const cancelTransactionAndUpdate = async ({
  queueId,
  pgtx,
}: CancelTransactionAndUpdateParams) => {
  const txData = await getTxById({ queueId, pgtx });
  if (!txData) {
    return {
      message: `Transaction ${queueId} not found.`,
    };
  }

  if (txData.signerAddress && txData.accountAddress) {
    switch (txData.status) {
      case TransactionStatus.Errored:
        throw createCustomError(
          `Cannot cancel user operation because it already errored`,
          StatusCodes.BAD_REQUEST,
          "TransactionErrored",
        );
      case TransactionStatus.Cancelled:
        throw createCustomError(
          `User operation was already cancelled`,
          StatusCodes.BAD_REQUEST,
          "TransactionAlreadyCancelled",
        );
      case TransactionStatus.Mined:
        throw createCustomError(
          `Cannot cancel user operation because it was already mined`,
          StatusCodes.BAD_REQUEST,
          "TransactionAlreadyMined",
        );
      case TransactionStatus.Sent:
        throw createCustomError(
          `Cannot cancel user operation because it was already processed.`,
          StatusCodes.BAD_REQUEST,
          "TransactionAlreadySubmitted",
        );
      case TransactionStatus.Queued:
        await updateTx({
          queueId,
          data: {
            status: TransactionStatus.Cancelled,
          },
        });
        return {
          message: "Transaction cancelled on-database successfully.",
        };
    }
  } else {
    switch (txData.status) {
      case TransactionStatus.Errored: {
        if (!txData.chainId || !txData.fromAddress) {
          throw new Error("Invalid transaction state to cancel.");
        }
        if (txData.nonce) {
          const { transactionHash, error } = await sendNullTransaction({
            chainId: parseInt(txData.chainId),
            walletAddress: txData.fromAddress,
            nonce: txData.nonce,
          });
          if (error) {
            return { message: error };
          }

          return {
            message: "Transaction cancelled successfully.",
            transactionHash,
          };
        }

        throw createCustomError(
          `Transaction has already errored: ${txData.errorMessage}`,
          StatusCodes.BAD_REQUEST,
          "TransactionErrored",
        );
      }
      case TransactionStatus.Cancelled:
        throw createCustomError(
          "Transaction is already cancelled.",
          StatusCodes.BAD_REQUEST,
          "TransactionAlreadyCancelled",
        );
      case TransactionStatus.Queued:
        await updateTx({
          queueId,
          pgtx,
          data: {
            status: TransactionStatus.Cancelled,
          },
        });
        return {
          message: "Transaction cancelled successfully.",
        };
      case TransactionStatus.Mined:
        throw createCustomError(
          "Transaction already mined.",
          StatusCodes.BAD_REQUEST,
          "TransactionAlreadyMined",
        );
      case TransactionStatus.Sent: {
        if (!txData.chainId || !txData.fromAddress || !txData.nonce) {
          throw new Error("Invalid transaction state to cancel.");
        }

        const { transactionHash, error } = await sendNullTransaction({
          chainId: parseInt(txData.chainId),
          walletAddress: txData.fromAddress,
          nonce: txData.nonce,
        });
        if (error) {
          return { message: error };
        }

        await updateTx({
          queueId,
          pgtx,
          data: {
            status: TransactionStatus.Cancelled,
          },
        });
        return {
          message: "Transaction cancelled successfully.",
          transactionHash,
        };
      }
    }
  }

  throw new Error("Unhandled cancellation state.");
};

const sendNullTransaction = async (args: {
  chainId: number;
  walletAddress: string;
  nonce: number;
  transactionHash?: string;
}): Promise<{
  transactionHash?: string;
  error?: string;
}> => {
  const { chainId, walletAddress, nonce, transactionHash } = args;

  const sdk = await getSdk({ chainId, walletAddress });
  const provider = sdk.getProvider();

  // Skip if the tx is already mined.
  if (transactionHash) {
    const txReceipt = await provider.getTransactionReceipt(transactionHash);
    if (txReceipt) {
      return { error: "Transaction already mined." };
    }
  }

  try {
    const gasOverrides = await getDefaultGasOverrides(provider);
    const { hash } = await sdk.wallet.sendRawTransaction({
      to: walletAddress,
      from: walletAddress,
      data: "0x",
      value: "0",
      nonce,
      ...multiplyGasOverrides(gasOverrides, 2),
    });
    return { transactionHash: hash };
  } catch (e: any) {
    return { error: e.toString() };
  }
};
