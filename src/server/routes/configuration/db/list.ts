import { Type, type Static } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { ConfigurationDB } from "../../../../db/configuration/db";
import {
  configurationSchema,
  toConfigurationSchema,
} from "../../../schemas/configuration";
import { standardResponseSchema } from "../../../schemas/sharedApiSchemas";

const responseBodySchema = Type.Object({
  result: configurationSchema,
});

export async function listConfiguration(fastify: FastifyInstance) {
  fastify.route<{
    Reply: Static<typeof responseBodySchema>;
  }>({
    method: "GET",
    url: "/configuration",
    schema: {
      summary: "List configuration",
      description:
        "List configuration values. Note: This does not include legacy configuration.",
      tags: ["Configuration"],
      operationId: "listConfiguration",
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseBodySchema,
      },
    },
    handler: async (req, res) => {
      const configuration = await ConfigurationDB.getAll();

      res.status(200).send({
        result: toConfigurationSchema(configuration),
      });
    },
  });
}
