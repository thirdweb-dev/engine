import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { prisma } from "../../../db/client";
import { getQueueStatus } from "../../../db/transactions/getQueueStatus";
import { getPercentile } from "../../../utils/math";
import { standardResponseSchema } from "../../schemas/sharedApiSchemas";

const QuerySchema = Type.Object({
  walletAddress: Type.Optional(Type.String()),
});

const responseBodySchema = Type.Object({
  result: Type.Object({
    queued: Type.Number(),
    pending: Type.Number(),
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
    Querystring: Static<typeof QuerySchema>;
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
      querystring: QuerySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseBodySchema,
      },
    },
    handler: async (req, res) => {
      const { walletAddress } = req.query;

      // Get # queued and sent transactions.
      const { queued, pending } = await getQueueStatus({ walletAddress });

      // Get sent/queued latency of last 1k txs.
      const recentTransactions = await prisma.transactions.findMany({
        orderBy: {
          queuedAt: "desc",
        },
        take: 1_000,
      });
      const msToSendArr: number[] = [];
      const msToMineArr: number[] = [];
      for (const transaction of recentTransactions) {
        const queuedAt = transaction.queuedAt.getTime();
        const sentAt = transaction.sentAt?.getTime();
        const minedAt = transaction.minedAt?.getTime();

        if (sentAt) {
          msToSendArr.push(sentAt - queuedAt);
        }
        if (minedAt) {
          msToMineArr.push(minedAt - queuedAt);
        }
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
