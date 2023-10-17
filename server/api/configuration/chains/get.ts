import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getConfiguration } from "../../../../src/db/configuration/getConfiguration";

export const ReplySchema = Type.Object({
  result: Type.Union([Type.String(), Type.Null()]),
});

export async function getChainsConfiguration(fastify: FastifyInstance) {
  fastify.route<{
    Reply: Static<typeof ReplySchema>;
  }>({
    method: "GET",
    url: "/configuration/chains",
    schema: {
      summary: "Get chain overrides configuration",
      description: "Get the engine configuration for chain overrides",
      tags: ["Configuration"],
      operationId: "getChainsConfiguration",
      response: {
        [StatusCodes.OK]: ReplySchema,
      },
    },
    handler: async (req, res) => {
      const config = await getConfiguration();
      res.status(200).send({
        result: config.chainOverrides,
      });
    },
  });
}
