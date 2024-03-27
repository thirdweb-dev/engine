import { FastifyInstance } from "fastify";
import { logger } from "../../utils/logger";

export const withRequestLogs = async (server: FastifyInstance) => {
  server.addHook("onRequest", async (request, reply) => {
    const path = request.routeOptions.url;

    if (
      !path?.includes("static") &&
      !path?.includes("json") &&
      request.method !== "OPTIONS"
    ) {
      logger({
        service: "server",
        level: "info",
        message: `Request received - ${request.method} - ${path}`,
      });
    }

    if (process.env.NODE_ENV === "production") {
      if (path?.includes("static")) {
        return reply.status(404).send({
          statusCode: 404,
          error: "Not Found",
          message: "Not Found",
        });
      }
    }
  });

  server.addHook("preHandler", async (request, reply) => {
    const path = request.routeOptions.url;

    if (
      !path?.includes("static") &&
      !path?.includes("json") &&
      !path?.includes("/backend-wallet/import") &&
      request.method !== "OPTIONS"
    ) {
      if (request.body && Object.keys(request.body).length > 0) {
        logger({
          service: "server",
          level: "info",
          message: `Request body - ${request.method} - ${path}`,
          data: request.body,
        });
      }

      if (request.params && Object.keys(request.params).length > 0) {
        logger({
          service: "server",
          level: "info",
          message: `Request params - ${request.method}`,
          data: request.params,
        });
      }

      if (request.query && Object.keys(request.query).length > 0) {
        logger({
          service: "server",
          level: "info",
          message: `Request querystring - ${request.method} - ${path}`,
          data: request.query,
        });
      }
    }
  });

  server.addHook("onResponse", (request, reply, done) => {
    const path = request.routeOptions.url;

    if (
      !path?.includes("static") &&
      !path?.includes("json") &&
      request.method !== "OPTIONS"
    ) {
      logger({
        service: "server",
        level: "info",
        message: `Request completed - ${
          request.method
        } - ${path} - status code: ${
          reply.statusCode
        } - Response time: ${reply.elapsedTime.toFixed(2)}ms`,
      });
    }

    done();
  });
};
