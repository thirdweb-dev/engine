import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getConfig } from "../../../../utils/cache/getConfig";
import { standardResponseSchema } from "../../../schemas/sharedApiSchemas";
import { mandatoryAllowedCorsUrls } from "../../../utils/cors-urls";

export const ReplySchema = Type.Object({
  result: Type.Array(Type.String()),
});

export async function getCorsConfiguration(fastify: FastifyInstance) {
  fastify.route<{
    Reply: Static<typeof ReplySchema>;
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
        [StatusCodes.OK]: ReplySchema,
      },
    },
    handler: async (req, res) => {
      const config = await getConfig();

      // Omit required domains.
      const omitted = config.accessControlAllowOrigin
        .split(",")
        .filter((url) => !mandatoryAllowedCorsUrls.includes(url));

      res.status(200).send({
        result: omitted,
      });
    },
  });
}
