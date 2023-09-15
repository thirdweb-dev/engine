import { fastifyBasicAuth } from "@fastify/basic-auth";
import fastifyCors from "@fastify/cors";
import fastifyExpress from "@fastify/express";
import { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import WebSocketPlugin from "@fastify/websocket";
import fastify, {
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
} from "fastify";
import * as fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
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

    // if (process.env.NODE_ENV === "production") {
    //   if (request.routerPath?.includes("static")) {
    //     return reply.status(404).send({
    //       statusCode: 404,
    //       error: "Not Found",
    //       message: "Not Found",
    //     });
    //   }
    // }

    const { url } = request;
    // Skip Authentication for Health Check and Static Files and JSON Files for Swagger
    // Doing Auth check onRequest helps prevent unauthenticated requests from consuming server resources.
    if (
      url === "/favicon.ico" ||
      url === "/" ||
      url === "/health" ||
      url.startsWith("/static") ||
      url.startsWith("/json") ||
      url.startsWith("/dashboard") ||
      url.startsWith("/style.css")
    ) {
      return;
    }

    if (
      request.headers.upgrade &&
      request.headers.upgrade.toLowerCase() === "websocket"
    ) {
      server.log.debug("WebSocket connection attempt");
      // ToDo: Uncomment WebSocket Authentication post Auth SDK is implemented
      // await performWSAuthentication(request, reply);
    } else {
      server.log.debug("Regular HTTP request");
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

  await openapi(server);

  await server.register(apiRoutes);

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
  const authenticate = { realm: "Westeros" };
  server.register(fastifyBasicAuth, {
    validate,
    authenticate,
  });

  function validate(
    username: string,
    password: string,
    req: FastifyRequest,
    reply: FastifyReply,
    done: (err?: Error) => void,
  ) {
    // if (
    //   username !== env.W3A_DASHBOARD_USERNAME ||
    //   password !== env.W3A_DASHBOARD_PASSWORD
    // ) {
    //   reply
    //     .code(401)
    //     .header("WWW-Authenticate", `Basic realm="${authenticate.realm}"`)
    //     .send("Unauthorized");
    // }
    done();
  }

  server.after(() => {
    server.route({
      url: "/dashboard",
      method: "GET",
      onRequest: server.basicAuth,
      handler: (req, res) => {
        const __filename = fileURLToPath(import.meta.url);

        const stream = fs.createReadStream(
          path.join(path.dirname(__filename), "../dashboard/index.html"),
        );
        return res.type("text/html").send(stream);
      },
    });
  });

  await server.ready();

  return server;
};

export default createServer;
