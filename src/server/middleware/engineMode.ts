import type { FastifyInstance } from "fastify";
import { env } from "../../utils/env";

export function withEnforceEngineMode(server: FastifyInstance) {
  if (env.ENGINE_MODE === "sandbox") {
    server.addHook("onRequest", async (request, reply) => {
      if (request.method !== "GET") {
        return reply.status(405).send({
          statusCode: 405,
          error: "Engine is in read-only mode. Only GET requests are allowed.",
          message:
            "Engine is in read-only mode. Only GET requests are allowed.",
        });
      }
    });
  }
}
