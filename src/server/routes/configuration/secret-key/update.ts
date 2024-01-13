import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { updateConfiguration } from "../../../../db/configuration/updateConfiguration";

const BodySchema = Type.Object({
  thirdwebApiSecretKey: Type.String(),
});

const ReplySchema = Type.Object({
  result: Type.Union([Type.String(), Type.Null()]),
});

export async function updateSecretKey(fastify: FastifyInstance) {
  fastify.route<{
    Body: Static<typeof BodySchema>;
    Reply: Static<typeof ReplySchema>;
  }>({
    method: "POST",
    url: "/configuration/thirdweb-api-secret-key",
    schema: {
      summary: "Update thirdweb api secret key",
      description:
        "Update the engine configuration for thirdweb api secret key",
      tags: ["Configuration"],
      operationId: "updateSecretKey",
      body: BodySchema,
      response: {
        [StatusCodes.OK]: ReplySchema,
      },
    },
    handler: async (req, res) => {
      const config = await updateConfiguration({
        thirdwebApiSecretKey: req.body.thirdwebApiSecretKey,
      });

      res.status(200).send({
        result: config.thirdwebApiSecretKey,
      });
    },
  });
}
