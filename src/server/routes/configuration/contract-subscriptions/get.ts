import { type Static, Type } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getConfig } from "../../../../shared/utils/cache/get-config";
import {
  contractSubscriptionConfigurationSchema,
  standardResponseSchema,
} from "../../../schemas/shared-api-schemas";

const responseSchema = Type.Object({
  result: contractSubscriptionConfigurationSchema,
});

export async function getContractSubscriptionsConfiguration(
  fastify: FastifyInstance,
) {
  fastify.route<{
    Reply: Static<typeof responseSchema>;
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
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (req, res) => {
      const config = await getConfig();
      res.status(StatusCodes.OK).send({
        result: {
          maxBlocksToIndex: config.maxBlocksToIndex,
          contractSubscriptionsRequeryDelaySeconds:
            config.contractSubscriptionsRequeryDelaySeconds,
        },
      });
    },
  });
}
