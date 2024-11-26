import { type Static, Type } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";

const responseBodySchema = Type.Object({
  message: Type.String(),
});

export async function home(fastify: FastifyInstance) {
  fastify.route<{
    Reply: Static<typeof responseBodySchema>;
  }>({
    method: "GET",
    url: "/",
    schema: {
      hide: true,
      summary: "/",
      description: "Instructions to manage your Engine",
      tags: ["System"],
      operationId: "home",
      response: {
        [StatusCodes.OK]: responseBodySchema,
      },
    },
    handler: async (_, res) => {
      return res.status(StatusCodes.OK).send({
        message:
          "Engine is set up successfully. Manage your Engine from https://thirdweb.com/dashboard/engine.",
      });
    },
  });
}
