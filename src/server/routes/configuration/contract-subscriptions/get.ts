import { Static } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getConfig } from "../../../../utils/cache/getConfig";
import {
  contractSubscriptionResponseSchema,
  standardResponseSchema,
} from "../../../schemas/sharedApiSchemas";

export async function getContractSubscriptionsConfiguration(
  fastify: FastifyInstance,
) {
  fastify.route<{
    Reply: Static<typeof contractSubscriptionResponseSchema>;
  }>({
    method: "GET",
    url: "/configuration/contract-subscriptions",
    schema: {
      summary: "Get Contract Subscriptions configuration",
      description: "Get the configuration for Contract Subscriptions",
      tags: ["Configuration"],
      operationId: "getContractSubscriptionsConfiguration",
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: contractSubscriptionResponseSchema,
      },
    },
    handler: async (req, res) => {
      const config = await getConfig();
      res.status(200).send({
        result: {
          maxBlocksToIndex: config.maxBlocksToIndex,
          contractSubscriptionsRequeryDelaySeconds:
            config.contractSubscriptionsRetryDelaySeconds,
        },
      });
    },
  });
}
