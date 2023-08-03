import fastifyCors from "@fastify/cors";
import fastifyExpress from "@fastify/express";
import { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import fastifyWebsocket from "@fastify/websocket";
import { AuthorizationResult } from "@thirdweb-dev/service-utils/dist/declarations/src/core/authorize/types.js";
import { authorizeNode } from "@thirdweb-dev/service-utils/node";
import fastify, { FastifyInstance } from "fastify";
import * as fs from "fs";
import { errorHandler, getLogSettings } from "../../core";
import {
  checkConnection,
  closeConnection,
  onConnection,
} from "../../core/fastify/websocketServer";
import { env } from "../../env";
import { apiRoutes } from "../../server/api";
import { openapi } from "./openapi";

const THIRDWEB_SDK_SECRET_KEY = env.THIRDWEB_SDK_SECRET_KEY;

const performAuthentication = async (
  request: any,
): Promise<AuthorizationResult> => {
  const secretKey = request.headers["x-secret-key"];
  if (secretKey && secretKey === THIRDWEB_SDK_SECRET_KEY) {
    const authorized = await authorizeNode(
      {
        req: request,
      },
      {
        apiUrl: env.THIRDWEB_API_ORIGIN,
        serviceScope: "storage",
        serviceAction: "write",
        enforceAuth: true,
        serviceApiKey: "",
      },
    );

    if (!authorized.authorized) {
      return {
        authorized: false,
        status: authorized.status,
        errorMessage: authorized.errorMessage,
        errorCode: authorized.errorCode,
      };
    }
    return {
      authorized: true,
      apiKeyMeta: authorized.apiKeyMeta,
      accountMeta: authorized.accountMeta,
    };
  }
  return {
    authorized: false,
    status: 401,
    errorMessage: "Missing Secret Key",
    errorCode: "MISSING_SECRET_KEY",
  };
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
        request.log.info({ ...request.params }, "Request Params : ");
      }

      if (request.query && Object.keys(request.query).length > 0) {
        request.log.info({ ...request.query }, "Request Querystring : ");
      }
    }

    // if (request.method === "POST") {
    //   //TODO check if this covers all request types that need to be gated
    //   //probably add admin actions, maybe everythign under /wallets to be also gated
    //   const isAuthenticated = await performAuthentication(request);

    //   if (!isAuthenticated.authorized) {
    //     // Modify the response to send a "403 Forbidden" error
    //     reply.code(403).send({ error: "Forbidden" });
    //     return;
    //   }
    // }
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
  await server.register(fastifyWebsocket);
  server.websocketServer.on("connection", onConnection(server));
  const interval = checkConnection(server)(server.websocketServer);
  server.websocketServer.on("close", closeConnection(interval));

  openapi(server);

  await server.register(apiRoutes);

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
