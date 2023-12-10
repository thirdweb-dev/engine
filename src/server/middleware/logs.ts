import { FastifyInstance } from "fastify";
import { logger } from "../../utils/logger";

export const withRequestLogs = async (server: FastifyInstance) => {
  server.addHook("onRequest", async (request, reply) => {
    if (
      !request.routerPath?.includes("static") &&
      !request.routerPath?.includes("json")
    ) {
      logger({
        service: "server",
        level: "info",
        message: `Request received - ${request.method} - ${request.routerPath}`,
      });
    }

    if (process.env.NODE_ENV === "production") {
      if (request.routerPath?.includes("static")) {
        return reply.status(404).send({
          statusCode: 404,
          error: "Not Found",
          message: "Not Found",
        });
      }
    }
  });

  server.addHook("preHandler", async (request, reply) => {
    if (
      !request.routerPath?.includes("static") &&
      !request.routerPath?.includes("json") &&
      !request.routerPath?.includes("/backend-wallet/import")
    ) {
      if (request.body && Object.keys(request.body).length > 0) {
        logger({
          service: "server",
          level: "info",
          message: `Request body`,
          data: request.body,
        });
      }

      if (request.params && Object.keys(request.params).length > 0) {
        logger({
          service: "server",
          level: "info",
          message: `Request params`,
          data: request.params,
        });
      }

      if (request.query && Object.keys(request.query).length > 0) {
        logger({
          service: "server",
          level: "info",
          message: `Request querystring`,
          data: request.query,
        });
      }
    }
  });

  server.addHook("onResponse", (request, reply, done) => {
    if (
      !request.routerPath?.includes("static") &&
      !request.routerPath?.includes("json")
    ) {
      logger({
        service: "server",
        level: "info",
        message: `Request completed - ${request.method} - ${
          reply.request.routerPath
        } - status code: ${reply.statusCode} - Response time: ${reply
          .getResponseTime()
          .toFixed(2)}ms`,
      });
    }

    done();
  });
};
