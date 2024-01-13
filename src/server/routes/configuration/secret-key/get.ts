import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getConfig } from "../../../../utils/cache/getConfig";

const ReplySchema = Type.Object({
  result: Type.Union([Type.String(), Type.Null()]),
});

export async function getSecretKey(fastify: FastifyInstance) {
  fastify.route<{
    Reply: Static<typeof ReplySchema>;
  }>({
    method: "GET",
    url: "/configuration/thirdweb-api-secret-key",
    schema: {
      summary: "Get thirdweb api secret key",
      description: "Get the engine configuration for thirdweb api secret key",
      tags: ["Configuration"],
      operationId: "getSecretKey",
      response: {
        [StatusCodes.OK]: ReplySchema,
      },
    },
    handler: async (req, res) => {
      const config = await getConfig();
      res.status(200).send({
        result: config.thirdwebApiSecretKey,
      });
    },
  });
}
