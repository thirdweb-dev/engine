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
        if (txData.chainId && txData.fromAddress && txData.nonce) {
          return await sendNullTransaction({
            chainId: parseInt(txData.chainId),
            walletAddress: txData.fromAddress,
            nonce: txData.nonce,
          });
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
        if (txData.chainId && txData.fromAddress && txData.nonce) {
          const { transactionHash, message } = await sendNullTransaction({
            chainId: parseInt(txData.chainId),
            walletAddress: txData.fromAddress,
            nonce: txData.nonce,
          });
          if (transactionHash) {
            await updateTx({
              queueId,
              pgtx,
              data: {
                status: TransactionStatus.Cancelled,
              },
            });
          }

          return { message, transactionHash };
        }
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
  message: string;
  transactionHash?: string;
}> => {
  const { chainId, walletAddress, nonce, transactionHash } = args;

  const sdk = await getSdk({ chainId, walletAddress });
  const provider = sdk.getProvider();

  // Skip if the tx is already mined.
  if (transactionHash) {
    const txReceipt = await provider.getTransactionReceipt(transactionHash);
    if (txReceipt) {
      return { message: "Transaction already mined." };
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
    return {
      message: "Transaction cancelled successfully.",
      transactionHash: hash,
    };
  } catch (e: any) {
    return { message: e.toString() };
  }
};
