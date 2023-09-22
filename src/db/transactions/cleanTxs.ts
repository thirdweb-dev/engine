import { Action } from "@prisma/client";
import { Static } from "@sinclair/typebox";
import { Action as ActionSchema } from "../../prisma/typebox";

// TODO: This shouldn't need to exist with zod
export const cleanTxs = (txs: Action[]): Static<typeof ActionSchema>[] => {
  return txs.map((tx) => {
    return {
      ...tx,
      queueId: tx.id,
      queuedAt: tx.queuedAt.toISOString(),
      sentAt: tx.sentAt?.toISOString() || null,
      processedAt: tx.processedAt?.toISOString() || null,
      minedAt: tx.minedAt?.toISOString() || null,
      status: !!tx.errorMessage
        ? "errored"
        : !!tx.minedAt
        ? "mined"
        : !!tx.sentAt
        ? "sent"
        : !!tx.processedAt
        ? "processed"
        : "queued",
    };
  });
};
