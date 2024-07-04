import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { standardResponseSchema } from "../../schemas/sharedApiSchemas";

const QuerySchema = Type.Object({
  walletAddress: Type.Optional(Type.String()),
});

const responseBodySchema = Type.Object({
  result: Type.Object({
    queued: Type.Number(),
    pending: Type.Number(),
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

      // @TODO: implement
      const queued = 0;
      const pending = 0;

      res.status(StatusCodes.OK).send({
        result: {
          queued,
          pending,
        },
      });
    },
  });
}
