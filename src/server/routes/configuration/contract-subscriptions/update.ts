import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { updateConfiguration } from "../../../../db/configuration/updateConfiguration";
import { getConfig } from "../../../../utils/cache/getConfig";
import { createCustomError } from "../../../middleware/error";
import { standardResponseSchema } from "../../../schemas/sharedApiSchemas";
import { ReplySchema } from "./get";

const BodySchema = Type.Object({
  maxBlocksToIndex: Type.Optional(Type.Number({ minimum: 1, maximum: 25 })),
  contractSubscriptionsRetryDelaySeconds: Type.Optional(Type.String()),
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
      summary: "Update contract-subscriptions configuration",
      description: "Update the engine configuration for contract-subscriptions",
      tags: ["Configuration"],
      operationId: "updateContractSubscriptionsConfiguration",
      body: BodySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: ReplySchema,
      },
    },
    handler: async (req, res) => {
      const { maxBlocksToIndex, contractSubscriptionsRetryDelaySeconds } =
        req.body;

      if (!maxBlocksToIndex && !contractSubscriptionsRetryDelaySeconds) {
        throw createCustomError(
          "At least one parameter is required",
          StatusCodes.BAD_REQUEST,
          "BAD_REQUEST",
        );
      }

      await updateConfiguration({
        maxBlocksToIndex,
        contractSubscriptionsRetryDelaySeconds,
      });
      const config = await getConfig(false);

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
