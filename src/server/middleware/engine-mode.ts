import { FastifyInstance } from "fastify";
import { env } from "../../utils/env";

export const withEnforceEngineMode = async (server: FastifyInstance) => {
  server.addHook("onRequest", async (request, reply) => {
    if (env.ENGINE_MODE === "sandbox") {
      if (request.method !== "GET") {
        return reply.status(405).send({
          statusCode: 405,
          error: "Read Only Mode. Method Not Allowed",
          message: "Read Only Mode. Method Not Allowed",
        });
      }
    }
  });
};
