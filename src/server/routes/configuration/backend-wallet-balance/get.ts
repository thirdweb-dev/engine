import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getConfig } from "../../../../utils/cache/getConfig";
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
      const config = await getConfig();
      res.status(StatusCodes.OK).send({
        result: {
          minWalletBalance: config.minWalletBalance,
        },
      });
    },
  });
}
