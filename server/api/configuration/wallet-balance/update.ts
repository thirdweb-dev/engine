import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { updateConfiguration } from "../../../../src/db/configuration/updateConfiguration";
import { ReplySchema } from "./get";

const BodySchema = Type.Partial(
  Type.Object({
    minWalletBalance: Type.String({
      description: "Minimum wallet balance in wei",
    }),
  }),
);

export async function updateWalletBalanceConfiguration(
  fastify: FastifyInstance,
) {
  fastify.route<{
    Body: Static<typeof BodySchema>;
  }>({
    method: "POST",
    url: "/configuration/wallet-balance",
    schema: {
      summary: "Update wallet-balance configuration",
      description: "Update wallet-balance configuration",
      tags: ["Configuration"],
      operationId: "updateWalletBalanceConfiguration",
      body: BodySchema,
      response: {
        [StatusCodes.OK]: ReplySchema,
      },
    },
    handler: async (req, res) => {
      const config = await updateConfiguration({ ...req.body });
      res.status(200).send({
        result: {
          minWalletBalance: config.minWalletBalance,
        },
      });
    },
  });
}
