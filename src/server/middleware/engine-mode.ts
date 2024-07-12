import { FastifyInstance } from "fastify";
import { env } from "../../utils/env";

export const withEnforceEngineMode = async (server: FastifyInstance) => {
  if (env.ENGINE_MODE === "sandbox") {
    server.addHook("onRequest", async (request, reply) => {
      if (request.method !== "GET") {
        return reply.status(405).send({
          statusCode: 405,
          error: "Read Only Mode. Method Not Allowed",
          message: "Read Only Mode. Method Not Allowed",
        });
      }
    });
  }
};
