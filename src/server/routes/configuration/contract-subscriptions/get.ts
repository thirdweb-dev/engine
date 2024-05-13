import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getConfig } from "../../../../utils/cache/getConfig";
import { standardResponseSchema } from "../../../schemas/sharedApiSchemas";

export const ReplySchema = Type.Object({
  result: Type.Object({
    maxBlocksToIndex: Type.Number(),
    contractSubscriptionsRetryDelaySeconds: Type.String(),
  }),
});

export async function getContractSubscriptionsConfiguration(
  fastify: FastifyInstance,
) {
  fastify.route<{
    Reply: Static<typeof ReplySchema>;
  }>({
    method: "GET",
    url: "/configuration/contract-subscriptions",
    schema: {
      summary: "Get contract-subscriptions configuration",
      description: "Get the engine configuration for contract-subscriptions",
      tags: ["Configuration"],
      operationId: "getContractSubscriptionsConfiguration",
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: ReplySchema,
      },
    },
    handler: async (req, res) => {
      const config = await getConfig();
      res.status(200).send({
        result: {
          maxBlocksToIndex: config.maxBlocksToIndex,
          contractSubscriptionsRetryDelaySeconds:
            config.contractSubscriptionsRetryDelaySeconds,
        },
      });
    },
  });
}
