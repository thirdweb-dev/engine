import fastifyCors from "@fastify/cors";
import fastifyExpress from "@fastify/express";
import { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import WebSocketPlugin from "@fastify/websocket";
import fastify, { FastifyInstance } from "fastify";
import * as fs from "fs";
import { env, errorHandler, getLogSettings } from "../../core";
import { apiRoutes } from "../../server/api";
import { performHTTPAuthentication } from "../middleware/auth";
import { openapi } from "./openapi";

const createServer = async (serverName: string): Promise<FastifyInstance> => {
  const logOptions = getLogSettings(serverName);

  const server: FastifyInstance = fastify({
    logger: logOptions ?? true,
    disableRequestLogging: true,
  }).withTypeProvider<TypeBoxTypeProvider>();

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
      url.startsWith("/static") ||
      url.startsWith("/json")
    ) {
      return;
    }

    if (
      request.headers.upgrade &&
      request.headers.upgrade.toLowerCase() === "websocket"
    ) {
      server.log.info("WebSocket connection attempt");
      // ToDo: Uncomment WebSocket Authentication post Auth SDK is implemented
      // await performWSAuthentication(request, reply);
    } else {
      server.log.info("Regular HTTP request");
      await performHTTPAuthentication(request, reply);
    }
  });

  server.addHook("preHandler", async (request, reply) => {
    if (
      !request.routerPath?.includes("static") &&
      !request.routerPath?.includes("json")
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
    allowedHeaders: [
      "Origin, X-Requested-With, Content-Type, Accept, Access-Control-Allow-Origin, Cache-Control",
    ],
  });

  await server.register(fastifyExpress);
  await server.register(WebSocketPlugin);

  openapi(server);

  await server.register(apiRoutes);

  // Add Health Check
  server.get("/health", async () => {
    return {
      status: "OK",
    };
  });

  await server.ready();

  // Command to Generate Swagger File
  // Needs to be called post Fastify Server is Ready
  server.swagger();

  // To Generate Swagger YAML File
  if (env.NODE_ENV === "local") {
    const yaml = server.swagger({ yaml: true });
    fs.writeFileSync("./swagger.yml", yaml);
  }

  return server;
};

export default createServer;
