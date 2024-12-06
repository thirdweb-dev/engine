import { type Static, Type } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getConfig } from "../../../../shared/utils/cache/getConfig";
import { standardResponseSchema } from "../../../schemas/sharedApiSchemas";

export const responseBodySchema = Type.Object({
  result: Type.Array(Type.String()),
});

export async function getIpAllowlist(fastify: FastifyInstance) {
  fastify.route<{
    Reply: Static<typeof responseBodySchema>;
  }>({
    method: "GET",
    url: "/configuration/ip-allowlist",
    schema: {
      summary: "Get Allowed IP Addresses",
      description: "Get the list of allowed IP addresses",
      tags: ["Configuration"],
      operationId: "getIpAllowlist",
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseBodySchema,
      },
    },
    handler: async (req, res) => {
      const config = await getConfig(false);

      res.status(StatusCodes.OK).send({
        result: config.ipAllowlist,
      });
    },
  });
}
