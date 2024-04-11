import { StaticJsonRpcProvider } from "@ethersproject/providers";
import { Transactions } from "@prisma/client";
import { StatusCodes } from "http-status-codes";
import { prisma } from "../../db/client";
import { updateTx } from "../../db/transactions/updateTx";
import { PrismaTransaction } from "../../schema/prisma";
import { getSdk } from "../../utils/cache/getSdk";
import { getGasSettingsForRetry } from "../../utils/gas";
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
  const tx = await prisma.transactions.findUnique({
    where: {
      id: queueId,
    },
  });
  if (!tx) {
    return {
      message: `Transaction ${queueId} not found.`,
    };
  }

  const status: TransactionStatus = tx.errorMessage
    ? TransactionStatus.Errored
    : tx.minedAt
    ? TransactionStatus.Mined
    : tx.cancelledAt
    ? TransactionStatus.Cancelled
    : tx.sentAt
    ? TransactionStatus.Sent
    : TransactionStatus.Queued;

  if (tx.signerAddress && tx.accountAddress) {
    switch (status) {
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
    switch (status) {
      case TransactionStatus.Errored: {
        if (tx.chainId && tx.fromAddress && tx.nonce) {
          const { message, transactionHash } = await cancelTransaction(tx);
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

        throw createCustomError(
          `Transaction has already errored: ${tx.errorMessage}`,
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
        if (tx.chainId && tx.fromAddress && tx.nonce) {
          const { message, transactionHash } = await cancelTransaction(tx);
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

const cancelTransaction = async (
  tx: Transactions,
): Promise<{
  message: string;
  transactionHash?: string;
}> => {
  if (!tx.fromAddress || !tx.nonce) {
    return { message: `Invalid transaction state to cancel. (${tx.id})` };
  }

  const sdk = await getSdk({
    chainId: parseInt(tx.chainId),
    walletAddress: tx.fromAddress,
  });
  const provider = sdk.getProvider() as StaticJsonRpcProvider;

  // Skip if the transaction is already mined.
  if (tx.transactionHash) {
    const receipt = await provider.getTransactionReceipt(tx.transactionHash);
    if (receipt) {
      return { message: "Transaction already mined." };
    }
  }

  try {
    const gasOptions = await getGasSettingsForRetry(tx, provider);
    // Send 0 currency to self.
    const { hash } = await sdk.wallet.sendRawTransaction({
      to: tx.fromAddress,
      from: tx.fromAddress,
      data: "0x",
      value: "0",
      nonce: tx.nonce,
      ...gasOptions,
    });

    return {
      message: "Transaction cancelled successfully.",
      transactionHash: hash,
    };
  } catch (e: any) {
    return { message: e.toString() };
  }
};
