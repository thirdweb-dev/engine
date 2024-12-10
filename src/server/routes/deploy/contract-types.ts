import { Static, Type } from "@sinclair/typebox";
import { PREBUILT_CONTRACTS_MAP } from "@thirdweb-dev/sdk";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { standardResponseSchema } from "../../schemas/shared-api-schemas";

// OUTPUT
export const responseBodySchema = Type.Object({
  result: Type.Array(Type.String()),
});

export async function contractTypes(fastify: FastifyInstance) {
  fastify.route<{
    Reply: Static<typeof responseBodySchema>;
  }>({
    method: "GET",
    url: "/deploy/contract-types",
    schema: {
      summary: "Get contract types",
      description: "Get all prebuilt contract types.",
      tags: ["Deploy"],
      operationId: "contractTypes",
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseBodySchema,
      },
    },
    handler: async (request, reply) => {
      reply.status(StatusCodes.OK).send({
        result: Object.keys(PREBUILT_CONTRACTS_MAP),
      });
    },
  });
}
