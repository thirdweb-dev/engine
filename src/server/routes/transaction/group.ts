import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { standardResponseSchema } from "../../schemas/sharedApiSchemas";
import { TransactionSchema } from "../../schemas/transaction";

const ParamsSchema = Type.Object({
  groupId: Type.String(),
});

const responseBodySchema = Type.Object({
  result: Type.Array(TransactionSchema),
});

// @deprecated
export async function checkGroupStatus(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof ParamsSchema>;
    Reply: Static<typeof responseBodySchema>;
  }>({
    method: "GET",
    url: "/transaction/status/group/:groupId",
    schema: {
      summary: "Get transaction status for a group",
      description: "Get the status for a transaction group.",
      tags: ["Transaction"],
      operationId: "status",
      params: ParamsSchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseBodySchema,
      },
      deprecated: true,
      hide: true,
    },
    handler: async (req, res) => {
      res.status(StatusCodes.OK).send({
        result: [],
      });
    },
  });
}
