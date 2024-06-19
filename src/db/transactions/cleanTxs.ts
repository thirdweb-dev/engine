import { Transactions } from "@prisma/client";
import { Static } from "@sinclair/typebox";
import { transactionResponseSchema } from "../../server/schemas/transaction";

// TODO: This shouldn't need to exist with zod
// @deprecated - use toTransactionSchema
export const cleanTxs = (
  txs: Transactions[],
): Static<typeof transactionResponseSchema>[] => {
  return txs.map((tx) => {
    return {
      ...tx,
      queueId: tx.id,
      id: undefined,
      queuedAt: tx.queuedAt.toISOString(),
      sentAt: tx.sentAt?.toISOString() || null,
      minedAt: tx.minedAt?.toISOString() || null,
      cancelledAt: tx.cancelledAt?.toISOString() || null,
      status: tx.errorMessage
        ? "errored"
        : tx.minedAt
        ? "mined"
        : tx.cancelledAt
        ? "cancelled"
        : tx.sentAt
        ? "sent"
        : "queued",
    };
  });
};
