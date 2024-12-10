import { Type, type Static } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { TransactionDB } from "../../../shared/db/transactions/db";
import { getPercentile } from "../../../shared/utils/math";
import type { MinedTransaction } from "../../../shared/utils/transaction/types";
import { MineTransactionQueue } from "../../../worker/queues/mine-transaction-queue";
import { SendTransactionQueue } from "../../../worker/queues/send-transaction-queue";
import { standardResponseSchema } from "../../schemas/shared-api-schemas";

const responseBodySchema = Type.Object({
  result: Type.Object({
    queued: Type.Integer(),
    pending: Type.Integer(),
    latency: Type.Object({
      msToSend: Type.Object({
        p50: Type.Number(),
        p90: Type.Number(),
      }),
      msToMine: Type.Object({
        p50: Type.Number(),
        p90: Type.Number(),
      }),
    }),
  }),
});

export async function queueStatus(fastify: FastifyInstance) {
  fastify.route<{
    Reply: Static<typeof responseBodySchema>;
  }>({
    method: "GET",
    url: "/system/queue",
    schema: {
      hide: true,
      summary: "Check queue status",
      description: "Check the status of the queue",
      tags: ["System"],
      operationId: "queueStatus",
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseBodySchema,
      },
    },
    handler: async (req, res) => {
      // Get # queued and sent transactions.
      const queued = await SendTransactionQueue.length();
      const pending = await MineTransactionQueue.length();

      // Get last 1k mined transactions.
      const minedTransactionsList =
        await TransactionDB.getTransactionListByStatus({
          status: "mined",
          page: 1,
          limit: 1_000,
        });
      const minedTransactions =
        minedTransactionsList.transactions as MinedTransaction[];

      // Get "queue -> send" and "queue -> mine" times.
      const msToSendArr: number[] = [];
      const msToMineArr: number[] = [];
      for (const transaction of minedTransactions) {
        const queuedAt = transaction.queuedAt.getTime();
        const sentAt = transaction.sentAt.getTime();
        const minedAt = transaction.minedAt.getTime();
        msToSendArr.push(sentAt - queuedAt);
        msToMineArr.push(minedAt - queuedAt);
      }

      res.status(StatusCodes.OK).send({
        result: {
          queued,
          pending,
          latency: {
            msToSend: {
              p50: getPercentile(msToSendArr, 50),
              p90: getPercentile(msToSendArr, 90),
            },
            msToMine: {
              p50: getPercentile(msToMineArr, 50),
              p90: getPercentile(msToMineArr, 90),
            },
          },
        },
      });
    },
  });
}
