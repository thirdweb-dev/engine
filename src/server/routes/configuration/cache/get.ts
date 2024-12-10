import { type Static, Type } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getConfig } from "../../../../shared/utils/cache/get-config";
import { standardResponseSchema } from "../../../schemas/shared-api-schemas";

export const responseBodySchema = Type.Object({
  result: Type.Object({
    clearCacheCronSchedule: Type.String(),
  }),
});

export async function getCacheConfiguration(fastify: FastifyInstance) {
  fastify.route<{
    Reply: Static<typeof responseBodySchema>;
  }>({
    method: "GET",
    url: "/configuration/cache",
    schema: {
      summary: "Get cache configuration",
      description: "Get cache configuration",
      tags: ["Configuration"],
      operationId: "getCacheConfiguration",
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseBodySchema,
      },
    },
    handler: async (req, res) => {
      const config = await getConfig();
      res.status(StatusCodes.OK).send({
        result: {
          clearCacheCronSchedule: config.clearCacheCronSchedule,
        },
      });
    },
  });
}
