import { Hex, defineChain, toSerializableTransaction } from "thirdweb";
import { Address, TransactionType } from "viem";
import { getAccount } from "../../utils/account";
import { thirdwebClient } from "../../utils/sdk";

// InsertedTransaction is the raw input from the caller.
export interface InsertedTransaction {
  chainId: number;
  from: Address;
  to?: Address;
  data: Hex;
  value?: bigint;

  gas?: bigint;
  gasPrice?: bigint;
  maxFeePerGas?: bigint;
  maxPriorityFeePerGas?: bigint;

  // Offchain metadata
  functionName?: string;
  functionArgs?: any[];
  deployedContractAddress?: string;
  deployedContractType?: string;
  extension?: string;
}

// QueuedTransaction is a transaction added to the queue.
export type QueuedTransaction = InsertedTransaction & {
  queueId: string;
  idempotencyKey: string;
  queuedAt: Date;
  data: Hex;
  value: bigint;
};

// PreparedTransaction has been simulated with partial onchain details set.
export type PreparedTransaction = QueuedTransaction & {
  nonce: number;
  retryCount: number;
};

// SentTransaction has been submitted to RPC successfully.
export type SentTransaction = PreparedTransaction & {
  sentAt: Date;
  sentAtBlock: bigint;
  transactionHash: Hex;
};

export type ConfirmedTransaction = SentTransaction & {
  confirmedAt: Date;
  confirmedAtBlock: bigint;
  type: TransactionType;
  status: "success" | "reverted";
  gasUsed: bigint;
  effectiveGasPrice: bigint;
};

// ErroredTransaction received an error before or while sending to RPC.
// A transaction that reverted onchain is not considered "errored".
export type ErroredTransaction = QueuedTransaction & {
  errorMessage: string;
};

// CancelledTransaction has been cancelled either via API or after some deadline.
export type CancelledTransaction = (QueuedTransaction | SentTransaction) & {
  cancelledAt: Date;
};

// interface CancelTransactionAndUpdateParams {
//   queueId: string;
//   pgtx?: PrismaTransaction;
// }

// export const cancelTransactionAndUpdate = async ({
//   queueId,
//   pgtx,
// }: CancelTransactionAndUpdateParams) => {
//   const tx = await prisma.transactions.findUnique({
//     where: {
//       id: queueId,
//     },
//   });
//   if (!tx) {
//     return {
//       message: `Transaction ${queueId} not found.`,
//     };
//   }

//   const status: TransactionStatus = tx.errorMessage
//     ? TransactionStatus.Errored
//     : tx.minedAt
//     ? TransactionStatus.Mined
//     : tx.cancelledAt
//     ? TransactionStatus.Cancelled
//     : tx.sentAt
//     ? TransactionStatus.Sent
//     : TransactionStatus.Queued;

//   if (tx.signerAddress && tx.accountAddress) {
//     switch (status) {
//       case TransactionStatus.Errored:
//         throw createCustomError(
//           `Cannot cancel user operation because it already errored`,
//           StatusCodes.BAD_REQUEST,
//           "TransactionErrored",
//         );
//       case TransactionStatus.Cancelled:
//         throw createCustomError(
//           `User operation was already cancelled`,
//           StatusCodes.BAD_REQUEST,
//           "TransactionAlreadyCancelled",
//         );
//       case TransactionStatus.Mined:
//         throw createCustomError(
//           `Cannot cancel user operation because it was already mined`,
//           StatusCodes.BAD_REQUEST,
//           "TransactionAlreadyMined",
//         );
//       case TransactionStatus.Sent:
//         throw createCustomError(
//           `Cannot cancel user operation because it was already processed.`,
//           StatusCodes.BAD_REQUEST,
//           "TransactionAlreadySubmitted",
//         );
//       case TransactionStatus.Queued:
//         await updateTx({
//           queueId,
//           data: { status: TransactionStatus.Cancelled },
//         });
//         return { message: "Transaction cancelled." };
//     }
//   } else {
//     switch (status) {
//       case TransactionStatus.Errored: {
//         if (tx.chainId && tx.fromAddress && tx.nonce) {
//           try {
//             const transactionHash = await cancelTransaction({
//               chainId: parseInt(tx.chainId),
//               from: tx.fromAddress as Address,
//               nonce: tx.nonce,
//             });
//             await updateTx({
//               pgtx,
//               queueId,
//               data: { status: TransactionStatus.Cancelled },
//             });
//             return { message: "Transaction cancelled.", transactionHash };
//           } catch (e: any) {
//             return { message: e.toString() };
//           }
//         }

//         throw createCustomError(
//           `Transaction has already errored: ${tx.errorMessage}`,
//           StatusCodes.BAD_REQUEST,
//           "TransactionErrored",
//         );
//       }
//       case TransactionStatus.Cancelled:
//         throw createCustomError(
//           "Transaction is already cancelled.",
//           StatusCodes.BAD_REQUEST,
//           "TransactionAlreadyCancelled",
//         );
//       case TransactionStatus.Queued:
//         await updateTx({
//           queueId,
//           pgtx,
//           data: { status: TransactionStatus.Cancelled },
//         });
//         return {
//           message: "Transaction cancelled successfully.",
//         };
//       case TransactionStatus.Mined:
//         throw createCustomError(
//           "Transaction already mined.",
//           StatusCodes.BAD_REQUEST,
//           "TransactionAlreadyMined",
//         );
//       case TransactionStatus.Sent: {
//         if (tx.chainId && tx.fromAddress && tx.nonce) {
//           try {
//             const transactionHash = await cancelTransaction({
//               chainId: parseInt(tx.chainId),
//               from: tx.fromAddress as Address,
//               nonce: tx.nonce,
//             });
//             await updateTx({
//               pgtx,
//               queueId,
//               data: { status: TransactionStatus.Cancelled },
//             });
//             return { message: "Transaction cancelled.", transactionHash };
//           } catch (e: any) {
//             return { message: e.toString() };
//           }
//         }
//       }
//     }
//   }

//   throw new Error("Unhandled cancellation state.");
// };

interface CancellableTransaction {
  chainId: number;
  from: Address;
  nonce: number;
}

export const sendCancellationTransaction = async (
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
