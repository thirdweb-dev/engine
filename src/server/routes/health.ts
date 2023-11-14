import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { isDatabaseHealthy } from "../../db/client";

const ReplySchemaOk = Type.Object({
  status: Type.String(),
});

const ReplySchemaError = Type.Object({
  error: Type.String(),
});

const ReplySchema = Type.Union([ReplySchemaOk, ReplySchemaError]);

export async function healthCheck(fastify: FastifyInstance) {
  fastify.route<{
    Reply: Static<typeof ReplySchema>;
  }>({
    method: "GET",
    url: "/health",
    schema: {
      summary: "Check health",
      description: "Check the system health of Engine",
      tags: ["System"],
      operationId: "checkHealth",
      response: {
        [StatusCodes.OK]: ReplySchemaOk,
        [StatusCodes.SERVICE_UNAVAILABLE]: ReplySchemaError,
      },
    },
    handler: async (req, res) => {
      const db = await isDatabaseHealthy();
      if (!db) {
        return res.status(StatusCodes.SERVICE_UNAVAILABLE).send({
          error: "The database is unreachable.",
        });
      }

      res.status(StatusCodes.OK).send({
        status: "OK",
      });
    },
  });
}
