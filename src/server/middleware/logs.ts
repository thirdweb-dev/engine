import { FastifyInstance } from "fastify";

export const withRequestLogs = async (server: FastifyInstance) => {
  server.addHook("onRequest", async (request, reply) => {
    if (
      !request.routerPath?.includes("static") &&
      !request.routerPath?.includes("json")
    ) {
      request.log.info(
        `Request Received - ${request.method} - ${request.routerPath}`,
      );
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
        request.log.info({ ...request.body }, "Request Body - ");
      }

      if (request.params && Object.keys(request.params).length > 0) {
        request.log.info({ ...request.params }, "Request Params - ");
      }

      if (request.query && Object.keys(request.query).length > 0) {
        request.log.info({ ...request.query }, "Request Querystring - ");
      }
    }
  });

  server.addHook("onResponse", (request, reply, done) => {
    if (
      !request.routerPath?.includes("static") &&
      !request.routerPath?.includes("json")
    ) {
      request.log.info(
        `Request Completed - ${request.method} - ${
          reply.request.routerPath
        } - StatusCode: ${reply.statusCode} - Response Time: ${reply
          .getResponseTime()
          .toFixed(2)}ms`,
      );
    }

    done();
  });
};
