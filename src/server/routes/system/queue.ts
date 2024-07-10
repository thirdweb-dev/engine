import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { MineTransactionQueue } from "../../../worker/queues/mineTransactionQueue";
import { SendTransactionQueue } from "../../../worker/queues/sendTransactionQueue";
import { standardResponseSchema } from "../../schemas/sharedApiSchemas";

const responseBodySchema = Type.Object({
  result: Type.Object({
    queued: Type.Number(),
    pending: Type.Number(),
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
      const queued = await SendTransactionQueue.length();
      const pending = await MineTransactionQueue.length();

      res.status(StatusCodes.OK).send({
        result: {
          queued,
          pending,
        },
      });
    },
  });
}
