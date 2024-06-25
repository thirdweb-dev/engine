import { StatusCodes } from "http-status-codes";
import { defineChain, toSerializableTransaction } from "thirdweb";
import { Address } from "viem";
import { prisma } from "../../db/client";
import { updateTx } from "../../db/transactions/updateTx";
import { PrismaTransaction } from "../../schema/prisma";
import { getAccount } from "../../utils/account";
import { thirdwebClient } from "../../utils/sdk";
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
          data: { status: TransactionStatus.Cancelled },
        });
        return { message: "Transaction cancelled." };
    }
  } else {
    switch (status) {
      case TransactionStatus.Errored: {
        if (tx.chainId && tx.fromAddress && tx.nonce) {
          try {
            const transactionHash = await cancelTransaction({
              chainId: parseInt(tx.chainId),
              from: tx.fromAddress as Address,
              nonce: tx.nonce,
            });
            await updateTx({
              pgtx,
              queueId,
              data: { status: TransactionStatus.Cancelled },
            });
            return { message: "Transaction cancelled.", transactionHash };
          } catch (e: any) {
            return { message: e.toString() };
          }
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
          data: { status: TransactionStatus.Cancelled },
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
          try {
            const transactionHash = await cancelTransaction({
              chainId: parseInt(tx.chainId),
              from: tx.fromAddress as Address,
              nonce: tx.nonce,
            });
            await updateTx({
              pgtx,
              queueId,
              data: { status: TransactionStatus.Cancelled },
            });
            return { message: "Transaction cancelled.", transactionHash };
          } catch (e: any) {
            return { message: e.toString() };
          }
        }
      }
    }
  }

  throw new Error("Unhandled cancellation state.");
};

interface CancellableTransaction {
  chainId: number;
  from: Address;
  nonce: number;
}

export const cancelTransaction = async (
  transaction: CancellableTransaction,
) => {
  const { chainId, from, nonce } = transaction;

  const chain = defineChain(chainId);
  const populatedTransaction = await toSerializableTransaction({
    from,
    transaction: {
      client: thirdwebClient,
      chain,
      to: from,
      data: "0x",
      value: 0n,
      nonce,
    },
  });

  // Set 2x current gas to prioritize this transaction over any pending one.
  // NOTE: This will not cancel a pending transaction set with higher gas.
  if (populatedTransaction.gasPrice) {
    populatedTransaction.gasPrice *= 2n;
  }
  if (populatedTransaction.maxFeePerGas) {
    populatedTransaction.maxFeePerGas *= 2n;
  }
  if (populatedTransaction.maxFeePerGas) {
    populatedTransaction.maxFeePerGas *= 2n;
  }

  const account = await getAccount({ chainId, from });
  const { transactionHash } = await account.sendTransaction(
    populatedTransaction,
  );
  return transactionHash;
};
