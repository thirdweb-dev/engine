import { Type, type Static } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { updateConfiguration } from "../../../../shared/db/configuration/update-configuration.js";
import { getConfig } from "../../../../shared/utils/cache/get-config.js";
import { WeiAmountStringSchema } from "../../../schemas/number.js";
import { standardResponseSchema } from "../../../schemas/shared-api-schemas.js";
import { responseBodySchema } from "./get.js";

const requestBodySchema = Type.Partial(
  Type.Object({
    minWalletBalance: {
      ...WeiAmountStringSchema,
      description: "Minimum wallet balance in wei",
    },
  }),
);

export async function updateBackendWalletBalanceConfiguration(
  fastify: FastifyInstance,
) {
  fastify.route<{
    Body: Static<typeof requestBodySchema>;
  }>({
    method: "POST",
    url: "/configuration/backend-wallet-balance",
    schema: {
      summary: "Update backend wallet balance configuration",
      description: "Update backend wallet balance configuration",
      tags: ["Configuration"],
      operationId: "updateBackendWalletBalanceConfiguration",
      body: requestBodySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseBodySchema,
      },
    },
    handler: async (req, res) => {
      await updateConfiguration({ ...req.body });
      const config = await getConfig(false);

      res.status(StatusCodes.OK).send({
        result: {
          minWalletBalance: config.minWalletBalance,
        },
      });
    },
  });
}
