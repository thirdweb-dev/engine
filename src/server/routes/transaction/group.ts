import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getTxsByGroupId } from "../../../db/transactions/getTxsByGroupId";
import { standardResponseSchema } from "../../schemas/sharedApiSchemas";
import { transactionResponseSchema } from "../../schemas/transaction";

const ParamsSchema = Type.Object({
  groupId: Type.String(),
});

const responseBodySchema = Type.Object({
  result: Type.Array(transactionResponseSchema),
});

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
    },
    handler: async (req, res) => {
      const { groupId } = req.params;
      const txs = await getTxsByGroupId({ groupId });

      res.status(StatusCodes.OK).send({
        result: txs,
      });
    },
  });
}
