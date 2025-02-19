import { type Static, Type } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getConfig } from "../../../../shared/utils/cache/get-config.js";
import { standardResponseSchema } from "../../../schemas/shared-api-schemas.js";

export const responseBodySchema = Type.Object({
  result: Type.Object({
    authDomain: Type.String(),
    mtlsCertificate: Type.Union([Type.String(), Type.Null()]),
    // Do not return mtlsPrivateKey.
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
      const { authDomain, mtlsCertificate } = await getConfig();

      res.status(StatusCodes.OK).send({
        result: {
          authDomain,
          mtlsCertificate,
        },
      });
    },
  });
}
