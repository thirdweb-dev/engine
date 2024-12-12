import { Type, type Static } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { updateConfiguration } from "../../../../shared/db/configuration/update-configuration";
import { getConfig } from "../../../../shared/utils/cache/get-config";
import { createCustomError } from "../../../middleware/error";
import {
  contractSubscriptionConfigurationSchema,
  standardResponseSchema,
} from "../../../schemas/shared-api-schemas";

const requestBodySchema = Type.Object({
  maxBlocksToIndex: Type.Optional(Type.Integer({ minimum: 1, maximum: 100 })),
  contractSubscriptionsRequeryDelaySeconds: Type.Optional(
    Type.String({
      description: `Requery after one or more delays. Use comma-separated positive integers. Example: "2,10" means requery after 2s and 10s.`,
    }),
  ),
});

const responseSchema = Type.Object({
  result: contractSubscriptionConfigurationSchema,
});

export async function updateContractSubscriptionsConfiguration(
  fastify: FastifyInstance,
) {
  fastify.route<{
    Body: Static<typeof requestBodySchema>;
  }>({
    method: "POST",
    url: "/configuration/contract-subscriptions",
    schema: {
      summary: "Update Contract Subscriptions configuration",
      description: "Update the configuration for Contract Subscriptions",
      tags: ["Configuration"],
      operationId: "updateContractSubscriptionsConfiguration",
      body: requestBodySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
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
          for (const delayStr of contractSubscriptionsRequeryDelaySeconds.split(
            ",",
          )) {
            const delayInt = Number.parseInt(delayStr);
            if (Number.isNaN(delayInt) || delayInt <= 0) {
              throw `Invalid delay value. Use comma-separated positive integers: "2,10"`;
            }
          }
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
