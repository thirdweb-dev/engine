import { Static } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import {
  standardResponseSchema,
  transactionWritesResponseSchema,
} from "../../schemas/sharedApiSchemas";

export async function relayTransaction(fastify: FastifyInstance) {
  fastify.route<{
    Reply: Static<typeof transactionWritesResponseSchema>;
  }>({
    method: "POST",
    url: "/transaction/relay",
    schema: {
      summary: "Relay a transaction",
      description: "Relay a transaction",
      tags: ["Transaction"],
      operationId: "relay",
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: transactionWritesResponseSchema,
      },
    },
    handler: async (req, res) => {
      const queueId = "...";

      res.status(200).send({
        result: {
          queueId,
        },
      });
    },
  });
}
