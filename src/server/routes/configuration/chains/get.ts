import { Type, type Static } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getConfig } from "../../../../shared/utils/cache/get-config";
import { chainResponseSchema } from "../../../schemas/chain";
import { standardResponseSchema } from "../../../schemas/shared-api-schemas";

export const responseBodySchema = Type.Object({
  result: Type.Array(chainResponseSchema),
});

export async function getChainsConfiguration(fastify: FastifyInstance) {
  fastify.route<{
    Reply: Static<typeof responseBodySchema>;
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
        [StatusCodes.OK]: responseBodySchema,
      },
    },
    handler: async (_req, res) => {
      const config = await getConfig();
      const result: Static<typeof chainResponseSchema>[] = config.chainOverrides
        ? JSON.parse(config.chainOverrides)
        : [];

      res.status(StatusCodes.OK).send({ result });
    },
  });
}
