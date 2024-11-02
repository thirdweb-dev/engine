import { Type, type Static } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { updateConfiguration } from "../../../../db/configuration/updateConfiguration";
import { getConfig } from "../../../../utils/cache/getConfig";
import { WeiAmountStringSchema } from "../../../schemas/number";
import { standardResponseSchema } from "../../../schemas/sharedApiSchemas";
import { responseBodySchema } from "./get";

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
