import fastifyCors from "@fastify/cors";
import fastifyExpress from "@fastify/express";
import { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import { getLogSettings, errorHandler, getEnv } from "../../core";
import fastify, { FastifyInstance } from "fastify";
import { apiRoutes } from "../../server/api";
import { openapi } from "./openapi";
import * as fs from "fs";

const performAuthentication = async (request: any) => {
  const secretKey = request.headers["x-shared-secret"];
  if (secretKey) {
    if (secretKey === getEnv("THIRDWEB_API_KEY")) {
      //TODO validate once on server load that this is a valid key
      return true;
    }
  }
  return false;
};

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
        request.log.info({ ...request.params }, "Request Param{s : ");
      }

      if (request.query && Object.keys(request.query).length > 0) {
        request.log.info({ ...request.query }, "Request Querystring : ");
      }
    }

    if (request.method === "POST") {
      //TODO check if this covers all request types that need to be gated
      //probably add admin actions, maybe everythign under /wallets to be also gated
      const isAuthenticated = await performAuthentication(request);

      if (!isAuthenticated) {
        // Modify the response to send a "403 Forbidden" error
        reply.code(403).send({ error: "Forbidden" });
        return;
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
  const originArray = getEnv("ACCESS_CONTROL_ALLOW_ORIGIN", "*").split(
    ",",
  ) as string[];
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

  openapi(server);

  await server.register(apiRoutes);

  await server.ready();

  // Command to Generate Swagger File
  // Needs to be called post Fastify Server is Ready
  server.swagger();

  // To Generate Swagger YAML File
  if (getEnv("NODE_ENV") === "local") {
    const yaml = server.swagger({ yaml: true });
    fs.writeFileSync("./swagger.yml", yaml);
  }

  return server;
};

export default createServer;
