import fastifyCors from "@fastify/cors";
import fastifyExpress from "@fastify/express";
import { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import { ThirdwebAuth, getToken as getJWT } from "@thirdweb-dev/auth/fastify";
import { LocalWallet } from "@thirdweb-dev/wallets";
import { AsyncWallet } from "@thirdweb-dev/wallets/evm/wallets/async";
import fastify, { FastifyInstance } from "fastify";
import { apiRoutes } from "../../server/api";
import { getConfiguration } from "../../src/db/configuration/getConfiguration";
import { getPermissions } from "../../src/db/permissions/getPermissions";
import { createToken } from "../../src/db/tokens/createToken";
import { getToken } from "../../src/db/tokens/getToken";
import { revokeToken } from "../../src/db/tokens/revokeToken";
import { env } from "../../src/utils/env";
import { logger } from "../../src/utils/logger";
import { errorHandler } from "../middleware/error";
import { openapi } from "./openapi";

const createServer = async (): Promise<FastifyInstance> => {
  const server: FastifyInstance = fastify({
    logger: logger.server,
    disableRequestLogging: true,
  }).withTypeProvider<TypeBoxTypeProvider>();

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
      "Origin",
      "X-Requested-With",
      "Content-Type",
      "Accept",
      "Access-Control-Allow-Origin",
      "Cache-Control",
      "Authorization",
    ],
    credentials: true,
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
  });

  server.addHook("preHandler", async (request, reply) => {
    if (
      !request.routerPath?.includes("static") &&
      !request.routerPath?.includes("json") &&
      !request.routerPath?.includes("/backend-wallet/import")
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

  const config = await getConfiguration();
  const { authRouter, authMiddleware, getUser } = ThirdwebAuth({
    domain: config.authDomain,
    wallet: new AsyncWallet({
      getSigner: async () => {
        const config = await getConfiguration();
        const wallet = new LocalWallet();
        await wallet.import({
          encryptedJson: config.authWalletEncryptedJson,
          password: env.THIRDWEB_API_SECRET_KEY,
        });

        return wallet.getSigner();
      },
      cacheSigner: false,
    }),
    callbacks: {
      onLogin: async (walletAddress) => {
        // When a user logs in, we check for their permissions in the database
        const res = await getPermissions({ walletAddress });

        // And we add their permissions as a scope to their JWT
        return {
          // TODO: Replace with default permissions
          permissions: res?.permissions || "none",
        };
      },
      onToken: async (jwt) => {
        // When a new JWT is generated, we save it in the database
        await createToken({ jwt, isAccessToken: false });
      },
      onLogout: async (_, req) => {
        const jwt = getJWT(req)!; // TODO: Fix this
        await revokeToken({ jwt });
      },
    },
  });

  await server.register(authRouter, { prefix: "/auth" });
  await server.register(authMiddleware);

  server.addHook("onRequest", async (req, res) => {
    if (
      req.url === "/favicon.ico" ||
      req.url === "/" ||
      req.url === "/health" ||
      req.url.startsWith("/static") ||
      req.url.startsWith("/json") ||
      req.url.startsWith("/auth")
    ) {
      return;
    }

    // TODO: Enable authentiction check for websocket requests
    if (
      req.headers.upgrade &&
      req.headers.upgrade.toLowerCase() === "websocket"
    ) {
      return;
    }

    // If we have a valid secret key, skip authentication check
    const thirdwebApiSecretKey = req.headers.authorization?.split(" ")[1];
    if (thirdwebApiSecretKey === env.THIRDWEB_API_SECRET_KEY) {
      return;
    }

    // Otherwise, check for an authenticated user
    const jwt = getJWT(req);
    if (jwt) {
      const token = await getToken({ jwt });

      // First, we ensure that the token hasn't been revoked
      if (token?.revokedAt === null) {
        // Then we perform our standard auth checks for the user
        const user = await getUser(req);
        if (user) {
          return;
        }
      }
    }

    // If we have no secret key or authenticated user, return 401
    return res.status(401).send({
      error: "Unauthorized",
      message: "Please provide a valid secret key or JWT",
    });
  });

  await server.register(fastifyExpress);
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

  await server.ready();

  return server;
};

export default createServer;
