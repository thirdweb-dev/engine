import { type Static, Type } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getConfig } from "../../../../shared/utils/cache/get-config";
import { standardResponseSchema } from "../../../schemas/shared-api-schemas";

export const responseBodySchema = Type.Object({
  result: Type.Object({
    domain: Type.String(),
  }),
});

export async function getAuthConfiguration(fastify: FastifyInstance) {
  fastify.route<{
    Reply: Static<typeof responseBodySchema>;
  }>({
    method: "GET",
    url: "/configuration/auth",
    schema: {
      summary: "Get auth configuration",
      description: "Get auth configuration",
      tags: ["Configuration"],
      operationId: "getAuthConfiguration",
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseBodySchema,
      },
    },
    handler: async (_req, res) => {
      const config = await getConfig();
      res.status(StatusCodes.OK).send({
        result: {
          domain: config.authDomain,
        },
      });
    },
  });
}
