import { type Static, Type } from "@sinclair/typebox";
import type { Queue } from "bullmq";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { stringify } from "thirdweb/utils";
import { TransactionDB } from "../../../shared/db/transactions/db";
import { getConfig } from "../../../shared/utils/cache/getConfig";
import { maybeDate } from "../../../shared/utils/primitiveTypes";
import { redis } from "../../../shared/utils/redis/redis";
import { MineTransactionQueue } from "../../../worker/queues/mineTransactionQueue";
import { SendTransactionQueue } from "../../../worker/queues/sendTransactionQueue";
import { createCustomError } from "../../middleware/error";
import { standardResponseSchema } from "../../schemas/sharedApiSchemas";

const requestSchema = Type.Object({
  queueId: Type.String({
    description: "Transaction queue ID",
    examples: ["9eb88b00-f04f-409b-9df7-7dcc9003bc35"],
  }),
});

const jobSchema = Type.Object({
  queue: Type.String(),
  jobId: Type.String(),
  timestamp: Type.String(),
  processedOn: Type.Optional(Type.String()),
  finishedOn: Type.Optional(Type.String()),
  lines: Type.Array(Type.String()),
});

export const responseBodySchema = Type.Object({
  result: Type.Object({
    raw: Type.Any(),
    jobs: Type.Array(jobSchema),
  }),
});

responseBodySchema.example = {
  result: {
    raw: {
      queueId: "9eb88b00-f04f-409b-9df7-7dcc9003bc35",
    },
    jobs: [
      {
        queue: "transactions-1-send",
        jobId: "430235bb-4430-47d2-9373-845454f2375e:0",
        timestamp: "2024-07-30T22:02:14.057Z",
        processedOn: "2024-07-30T22:02:14.062Z",
        finishedOn: "2024-07-30T22:02:14.832Z",
        lines: ["..."],
      },
      {
        queue: "transactions-2-mine",
        jobId: "430235bb-4430-47d2-9373-845454f2375e",
        timestamp: "2024-07-30T22:02:14.828Z",
        processedOn: "2024-07-30T22:02:17.748Z",
        finishedOn: "2024-07-30T22:02:17.977Z",
        lines: ["..."],
      },
    ],
  },
};

export async function getTransactionDetails(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof responseBodySchema>;
  }>({
    method: "GET",
    url: "/admin/transaction-details/:queueId",
    schema: {
      summary: "Get transaction details",
      description: "Get raw logs and details for a transaction by queueId.",
      tags: ["Admin"],
      operationId: "transactionDetails",
      params: requestSchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseBodySchema,
      },
      hide: true,
    },
    handler: async (request, reply) => {
      const { queueId } = request.params;

      const transaction = await TransactionDB.get(queueId);
      if (!transaction) {
        throw createCustomError(
          "Transaction not found.",
          StatusCodes.BAD_REQUEST,
          "TRANSACTION_NOT_FOUND",
        );
      }

      const config = await getConfig();
      const jobs: Static<typeof jobSchema>[] = [];

      // SentTransaction jobs.
      for (
        let resendCount = 0;
        resendCount < config.maxRetriesPerTx;
        resendCount++
      ) {
        const jobDetails = await getJobDetails({
          queue: SendTransactionQueue.q,
          jobId: SendTransactionQueue.jobId({ queueId, resendCount }),
        });
        if (jobDetails) {
          jobs.push(jobDetails);
        }
      }

      // MineTransaction job.
      const jobDetails = await getJobDetails({
        queue: MineTransactionQueue.q,
        jobId: MineTransactionQueue.jobId({ queueId }),
      });
      if (jobDetails) {
        jobs.push(jobDetails);
      }

      reply.status(StatusCodes.OK).send({
        result: {
          raw: JSON.parse(stringify(transaction)),
          jobs,
        },
      });
    },
  });
}

const getJobDetails = async (args: {
  queue: Queue;
  jobId: string;
}): Promise<Static<typeof jobSchema> | null> => {
  const { queue, jobId } = args;
  const job = await queue.getJob(jobId);
  if (!job) {
    return null;
  }

  const key = `bull:${queue.name}:${jobId}:logs`;
  const lines = await redis.lrange(key, 0, -1);
  return {
    queue: queue.name,
    jobId,
    timestamp: maybeDate(job.timestamp).toISOString(),
    processedOn: maybeDate(job.processedOn)?.toISOString(),
    finishedOn: maybeDate(job.finishedOn)?.toISOString(),
    lines,
  };
};
