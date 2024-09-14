import { Type, type Static } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { ConfigurationDB } from "../../../../db/configuration/db";
import { maybeBigInt } from "../../../../utils/primitiveTypes";
import {
  configurationSchema,
  toConfigurationSchema,
} from "../../../schemas/configuration";
import { standardResponseSchema } from "../../../schemas/sharedApiSchemas";

const requestBodySchema = Type.Partial(configurationSchema);

const responseBodySchema = Type.Object({
  result: configurationSchema,
});

export async function setConfiguration(fastify: FastifyInstance) {
  fastify.route<{
    Body: Static<typeof requestBodySchema>;
    Reply: Static<typeof responseBodySchema>;
  }>({
    method: "POST",
    url: "/configuration",
    schema: {
      summary: "Set configuration",
      description:
        "Set configuration values. Note: This does not include legacy configuration.",
      tags: ["Configuration"],
      operationId: "setConfiguration",
      body: requestBodySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseBodySchema,
      },
    },
    handler: async (req, res) => {
      const { extraGas } = req.body;

      await ConfigurationDB.set({
        extraGas: maybeBigInt(extraGas),
      });

      const configuration = await ConfigurationDB.getAll();
      res.status(200).send({
        result: toConfigurationSchema(configuration),
      });
    },
  });
}
