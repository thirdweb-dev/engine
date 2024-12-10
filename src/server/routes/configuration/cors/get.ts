import { type Static, Type } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getConfig } from "../../../../shared/utils/cache/get-config";
import { standardResponseSchema } from "../../../schemas/sharedApiSchemas";
import { mandatoryAllowedCorsUrls } from "../../../utils/cors-urls";

export const responseBodySchema = Type.Object({
  result: Type.Array(Type.String()),
});

export async function getCorsConfiguration(fastify: FastifyInstance) {
  fastify.route<{
    Reply: Static<typeof responseBodySchema>;
  }>({
    method: "GET",
    url: "/configuration/cors",
    schema: {
      summary: "Get CORS configuration",
      description: "Get CORS configuration",
      tags: ["Configuration"],
      operationId: "getCorsConfiguration",
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseBodySchema,
      },
    },
    handler: async (req, res) => {
      const config = await getConfig(false);

      // Omit required domains.
      const omitted = config.accessControlAllowOrigin
        .split(",")
        .filter((url) => !mandatoryAllowedCorsUrls.includes(url));

      res.status(StatusCodes.OK).send({
        result: omitted,
      });
    },
  });
}
