import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getQueueStatus } from "../../../db/transactions/getQueueStatus";
import { standardResponseSchema } from "../../schemas/sharedApiSchemas";

const QuerySchema = Type.Object({
  walletAddress: Type.Optional(Type.String()),
});

const ReplySchema = Type.Object({
  result: Type.Object({
    queued: Type.Number(),
    pending: Type.Number(),
  }),
});

export async function queueStatus(fastify: FastifyInstance) {
  fastify.route<{
    Querystring: Static<typeof QuerySchema>;
    Reply: Static<typeof ReplySchema>;
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
        [StatusCodes.OK]: ReplySchema,
      },
    },
    handler: async (req, res) => {
      const { walletAddress } = req.query;

      const { queued, pending } = await getQueueStatus({ walletAddress });
      res.status(StatusCodes.OK).send({
        result: {
          queued,
          pending,
        },
      });
    },
  });
}
