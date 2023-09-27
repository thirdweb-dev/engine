import fastifyCors from "@fastify/cors";
import fastifyExpress from "@fastify/express";
import { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import WebSocketPlugin from "@fastify/websocket";
import fastify, { FastifyInstance } from "fastify";
import { errorHandler } from "../../core";
import { getAllWallets } from "../../src/db/wallets/getAllWallets";
import { env } from "../../src/utils/env";
import { logger } from "../../src/utils/logger";
import { apiRoutes } from "../api";
import { performHTTPAuthentication } from "../middleware/auth";
import { openapi } from "./openapi";

let walletImported = false;

export const createServer = async (): Promise<FastifyInstance> => {
  const server: FastifyInstance = fastify({
    logger: logger.server,
    disableRequestLogging: true,
  }).withTypeProvider<TypeBoxTypeProvider>();

  const walletsDetails = await getAllWallets();
  if (walletsDetails.length <= 0) {
    logger.server.error(
      `--------------------------No Wallets configured in the DB--------------------------`,
    );
  } else {
    walletImported = true;
  }

  const originArray = env.ACCESS_CONTROL_ALLOW_ORIGIN.split(",") as string[];
  await server.register(fastifyCors, {
    origin: originArray.map((data) => {
      if (data.startsWith("/") && data.endsWith("/")) {
        return new RegExp(data.slice(1, -1));
      }

      if (data.startsWith("*.")) {
        const regex = data.replace("*.", ".*.");
        return new RegExp(regex);
      }
      return data;
    }),
    credentials: true,
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
    allowedHeaders:
      "Origin, X-Requested-With, Content-Type, Accept, Access-Control-Allow-Origin, Cache-Control, Access-Control-Allow-Header, Access-Control-Allow-Credentials, Access-Control-Allow-Methods, Authorization",
  });

  server.addHook("onRequest", async (request, reply) => {
    if (
      !request.routerPath?.includes("static") &&
      !request.routerPath?.includes("json")
    ) {
      request.log.info(
        `Request received - ${request.method} - ${request.routerPath}`,
      );
    }

    const { url } = request;
    // Skip Authentication for Health Check and Static Files and JSON Files for Swagger
    // Doing Auth check onRequest helps prevent unauthenticated requests from consuming server resources.
    if (
      url === "/favicon.ico" ||
      url === "/" ||
      url === "/health" ||
      url.startsWith("/swagger-docs") ||
      url.startsWith("/json") ||
      url.startsWith("/static")
    ) {
      return;
    }

    if (
      request.headers.upgrade &&
      request.headers.upgrade.toLowerCase() === "websocket"
    ) {
      logger.server.debug("WebSocket connection attempt");
      // ToDo: Uncomment WebSocket Authentication post Auth SDK is implemented
      // await performWSAuthentication(request, reply);
    } else {
      logger.server.debug("Regular HTTP request");

      await performHTTPAuthentication(request, reply);

      if (
        request.url === "/wallet/import" ||
        request.url === "/wallet/create" ||
        request.url === "/config/create"
      ) {
        return;
      }

      if (!walletImported) {
        logger.server.debug("Wallets not imported");
        const walletsDetails = await getAllWallets();
        if (walletsDetails.length <= 0) {
          logger.server.error("No Wallets configured in the DB");
          return reply.status(401).send({
            statusCode: 401,
            error:
              "No Wallets configured in the DB. Please Create or Import a Wallet",
            message: "No Wallets Found",
          });
        }
        walletImported = true;
      }
    }
  });

  server.addHook("preHandler", async (request, reply) => {
    if (
      !request.routerPath?.includes("static") &&
      !request.routerPath?.includes("json") &&
      !request.routerPath?.includes("import")
    ) {
      if (request.body && Object.keys(request.body).length > 0) {
        request.log.info({ ...request.body }, "Request Body : ");
      }

      if (request.params && Object.keys(request.params).length > 0) {
        request.log.info({ ...request.params }, "Request Params : ");
      }

      if (request.query && Object.keys(request.query).length > 0) {
        request.log.info({ ...request.query }, "Request Querystring : ");
      }
    }
  });

  server.addHook("onResponse", (request, reply, done) => {
    if (
      !request.routerPath?.includes("static") &&
      !request.routerPath?.includes("json")
    ) {
      request.log.info(
        `Request completed - ${request.method} - ${
          reply.request.routerPath
        } - StatusCode: ${reply.statusCode} - Response Time: ${reply
          .getResponseTime()
          .toFixed(2)}ms`,
      );
    }
    done();
  });

  await errorHandler(server);

  await server.register(fastifyExpress);
  await server.register(WebSocketPlugin);

  /* TODO Add a real health check
   * check if postgres connection is valid
   * have worker write a heartbeat to db
   * check the last worker heartbeat time
   * (probably more to do)
   * */
  server.get("/health", async () => {
    return {
      status: "OK",
    };
  });

  await openapi(server);

  await server.register(apiRoutes);

  await server.ready();

  return server;
};
