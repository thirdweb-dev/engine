import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getConfig } from "../../../../utils/cache/getConfig";
import { standardResponseSchema } from "../../../schemas/sharedApiSchemas";

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
      description: "Get chain overrides configuration",
      tags: ["Configuration"],
      operationId: "getChainsConfiguration",
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: ReplySchema,
      },
    },
    handler: async (req, res) => {
      const config = await getConfig();
      res.status(200).send({
        result: config.chainOverrides,
      });
    },
  });
}
