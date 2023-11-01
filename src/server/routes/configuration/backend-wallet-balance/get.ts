import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getConfiguration } from "../../../../db/configuration/getConfiguration";
import { standardResponseSchema } from "../../../schemas/sharedApiSchemas";

export const ReplySchema = Type.Object({
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
    Reply: Static<typeof ReplySchema>;
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
        [StatusCodes.OK]: ReplySchema,
      },
    },
    handler: async (req, res) => {
      const config = await getConfiguration();
      res.status(200).send({
        result: {
          minWalletBalance: config.minWalletBalance,
        },
      });
    },
  });
}
