import { Transactions } from "@prisma/client";
import { Static } from "@sinclair/typebox";
import { transactionResponseSchema } from "../../server/schemas/transaction";

// TODO: This shouldn't need to exist with zod
export const cleanTxs = (
  txs: Transactions[],
): Static<typeof transactionResponseSchema>[] => {
  return txs.map((tx) => {
    return {
      ...tx,
      queueId: tx.id,
      id: undefined,
      processedAt: undefined,
      queuedAt:
        tx.queuedAt instanceof Date ? tx.queuedAt.toISOString() : tx.queuedAt,
      sentAt: tx.sentAt instanceof Date ? tx.sentAt?.toISOString() : tx.sentAt,
      minedAt:
        tx.minedAt instanceof Date ? tx.minedAt?.toISOString() : tx.minedAt,
      cancelledAt:
        tx.cancelledAt instanceof Date
          ? tx.cancelledAt?.toISOString()
          : tx.cancelledAt,
      status: !!tx.errorMessage
        ? "errored"
        : !!tx.minedAt
        ? "mined"
        : !!tx.cancelledAt
        ? "cancelled"
        : !!tx.sentAt && tx.retryCount === 0
        ? "sent"
        : !!tx.sentAt && tx.retryCount > 0
        ? "retried"
        : "queued",
    };
  });
};
