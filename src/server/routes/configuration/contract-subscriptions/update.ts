import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { updateConfiguration } from "../../../../db/configuration/updateConfiguration";
import { getConfig } from "../../../../utils/cache/getConfig";
import { createCustomError } from "../../../middleware/error";
import {
  contractSubscriptionResponseSchema,
  standardResponseSchema,
} from "../../../schemas/sharedApiSchemas";

const BodySchema = Type.Object({
  maxBlocksToIndex: Type.Optional(Type.Number({ minimum: 1, maximum: 25 })),
  contractSubscriptionsRequeryDelaySeconds: Type.Optional(Type.String()),
});

export async function updateContractSubscriptionsConfiguration(
  fastify: FastifyInstance,
) {
  fastify.route<{
    Body: Static<typeof BodySchema>;
  }>({
    method: "POST",
    url: "/configuration/contract-subscriptions",
    schema: {
      summary: "Update Contract Subscriptions configuration",
      description: "Update the configuration for Contract Subscriptions",
      tags: ["Configuration"],
      operationId: "updateContractSubscriptionsConfiguration",
      body: BodySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: contractSubscriptionResponseSchema,
      },
    },
    handler: async (req, res) => {
      const { maxBlocksToIndex, contractSubscriptionsRequeryDelaySeconds } =
        req.body;

      if (!maxBlocksToIndex && !contractSubscriptionsRequeryDelaySeconds) {
        throw createCustomError(
          "At least one parameter is required",
          StatusCodes.BAD_REQUEST,
          "BAD_REQUEST",
        );
      }

      if (contractSubscriptionsRequeryDelaySeconds) {
        try {
          contractSubscriptionsRequeryDelaySeconds.split(",").forEach((d) => {
            if (Number.isNaN(parseInt(d))) {
              throw "Invalid number";
            }
          });
        } catch {
          throw createCustomError(
            'At least one integer "contractSubscriptionsRequeryDelaySeconds" is required',
            StatusCodes.BAD_REQUEST,
            "BAD_REQUEST",
          );
        }
      }

      await updateConfiguration({
        maxBlocksToIndex,
        contractSubscriptionsRetryDelaySeconds:
          contractSubscriptionsRequeryDelaySeconds,
      });
      const config = await getConfig(false);

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
