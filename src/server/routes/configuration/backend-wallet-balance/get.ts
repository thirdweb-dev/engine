import { type Static, Type } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getConfig } from "../../../../shared/utils/cache/get-config";
import { standardResponseSchema } from "../../../schemas/shared-api-schemas";

export const responseBodySchema = Type.Object({
  result: Type.Object({
    minWalletBalance: Type.String({
      description: "Minimum wallet balance in wei",
    }),
  }),
});

export async function getBackendWalletBalanceConfiguration(
  fastify: FastifyInstance,
) {
  fastify.route<{
    Reply: Static<typeof responseBodySchema>;
  }>({
    method: "GET",
    url: "/configuration/backend-wallet-balance",
    schema: {
      summary: "Get wallet-balance configuration",
      description: "Get wallet-balance configuration",
      tags: ["Configuration"],
      operationId: "getBackendWalletBalanceConfiguration",
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseBodySchema,
      },
    },
    handler: async (_req, res) => {
      const config = await getConfig();
      res.status(StatusCodes.OK).send({
        result: {
          minWalletBalance: config.minWalletBalance,
        },
      });
    },
  });
}
