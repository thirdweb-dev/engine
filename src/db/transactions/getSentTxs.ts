import { Static } from "@sinclair/typebox";
import { env } from "../../../core/env";
import { transactionResponseSchema } from "../../../server/schemas/transaction";
import { prisma } from "../client";
import { cleanTxs } from "./cleanTxs";

export const getSentTxs = async (): Promise<
  Static<typeof transactionResponseSchema>[]
> => {
  const txs = await prisma.transactions.findMany({
    where: {
      processedAt: {
        not: null,
      },
      sentAt: {
        not: null,
      },
      transactionHash: {
        not: null,
      },
      minedAt: null,
      errorMessage: null,
      retryCount: {
        // TODO: What should the max retries be here?
        lt: 3,
      },
    },
    orderBy: [
      {
        sentAt: "asc",
      },
    ],
    // TODO: Should this be coming from env?
    take: env.MIN_TX_TO_CHECK_FOR_MINED_STATUS,
  });

  return cleanTxs(txs);
};
