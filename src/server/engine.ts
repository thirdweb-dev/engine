import { Hono } from "hono";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
import { requestLogger } from "./middleware/request-logger";
import { createApiCorsMiddleware } from "./middleware/cors";
import { prometheusMiddleware } from "./middleware/prometheus";
import { env } from "../lib/env";
import { defaultLogger } from "../lib/logger";
import { some } from "hono/combine";
import { dashboardAuth } from "./middleware/auth/dashboard";
import { accessTokenAuth } from "./middleware/auth/access-token";
import { webhookAuth } from "./middleware/auth/webhook";
import { config } from "../lib/config";
import { HTTPException } from "hono/http-exception";
import {
  EngineHttpException,
  getDefaultErrorMessage,
  unwrapError,
} from "../lib/errors";
import { rateLimitMiddleware } from "./middleware/rate-limit";
import { secretKeyAuth } from "./middleware/auth/secret-key";
import { healthCheckRoute } from "./routes/health";
import { apiReference } from "@scalar/hono-api-reference";

import { accountsRoutes } from "./routes/accounts/accounts";
import { openAPISpecs } from "hono-openapi";
import { accountRouter } from "./account";
import { setupQueuesUiRoutes } from "./routes/queues";
import { transactionsRoutes } from "./routes/transactions";
import { correlationId } from "./middleware/correlation-id";

const engineServer = new Hono();
const publicRoutes = new Hono();

publicRoutes.route("/health", healthCheckRoute);
publicRoutes.route("/system/health", healthCheckRoute);
publicRoutes.get("/", async (c) => {
  return c.json({
    message:
      "Engine is set up successfully. Manage your Engine from https://thirdweb.com/dashboard/engine.",
  });
});

publicRoutes.get(
  "/openapi",
  openAPISpecs(engineServer, {
    documentation: {
      info: {
        title: "Engine",
        version: "3.0.0-rc.0",
        description: "API Documentation",
      },
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
          },
        },
      },
      security: [
        {
          bearerAuth: [],
        },
      ],
      servers: [
        {
          url: "http://localhost:3005",
          description: "Local server",
        },
      ],
    },
  })
);

publicRoutes.get(
  "/docs",
  apiReference({
    theme: "kepler",
    spec: {
      url: "/openapi",
    },
  })
);

setupQueuesUiRoutes(publicRoutes, "/admin/queues");
engineServer.route("/", publicRoutes);

engineServer.use(correlationId);

const apiCorsMiddleware = createApiCorsMiddleware({
  allowedOrigins: config.accessControlAllowOrigin,
});

if (env.NODE_ENV === "development" || env.NODE_ENV === "local") {
  engineServer.use(logger());
} else {
  engineServer.use(requestLogger);
}

engineServer.use(
  secureHeaders({
    contentSecurityPolicy: {
      defaultSrc: ["'self'"],
    },
    xFrameOptions: "DENY",
    permissionsPolicy: {
      geolocation: [],
      camera: [],
      microphone: [],
    },
  })
);

engineServer.use(prometheusMiddleware);
engineServer.use(apiCorsMiddleware);

engineServer.use(rateLimitMiddleware);

engineServer.use(
  some(secretKeyAuth, webhookAuth, dashboardAuth, accessTokenAuth)
);

engineServer.route("/accounts", accountsRoutes);
engineServer.route("/transactions", transactionsRoutes);
engineServer.route("/account", accountRouter);

engineServer.onError((err, c) => {
  if (err instanceof HTTPException) {
    if (err instanceof EngineHttpException) {
      const engineErr = err.engineErr;
      return c.json(
        {
          error: {
            ...engineErr,
            message: engineErr.message ?? getDefaultErrorMessage(engineErr),
            source: unwrapError(engineErr.source),
          },
        },
        engineErr.status
      );
    }
    const response = err.getResponse();
    return response;
  }

  defaultLogger.error("unhandled error", err);

  return c.json(
    {
      error: {
        message: "Internal server error",
        source: err,
      },
    },
    500
  );
});

const tls = env.ENABLE_HTTPS
  ? {
      key: Bun.file("../https/key.pem"),
      cert: Bun.file("../https/cert.pem"),
      passphrase: env.HTTPS_PASSPHRASE,
    }
  : {};

export function initiateEngineServer() {
  Bun.serve({
    port: env.PORT,
    tls,
    fetch: engineServer.fetch,
    idleTimeout: 255, // max value
  });
  defaultLogger.info(`Engine is ready and listening on port ${env.PORT}`);
}
