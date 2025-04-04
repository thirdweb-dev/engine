import { Hono } from "hono";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
import { requestLogger } from "./middleware/request-logger.js";
import { createApiCorsMiddleware } from "./middleware/cors.js";
import { prometheusMiddleware } from "./middleware/prometheus.js";
import { env } from "../lib/env.js";
import { defaultLogger } from "../lib/logger.js";
import { some } from "hono/combine";
import { dashboardAuth } from "./middleware/auth/dashboard.js";
import { accessTokenAuth } from "./middleware/auth/access-token.js";
import { webhookAuth } from "./middleware/auth/webhook.js";
import { config } from "../lib/config.js";
import { HTTPException } from "hono/http-exception";
import {
  EngineHttpException,
  getDefaultErrorMessage,
  unwrapError,
} from "../lib/errors.js";
import { rateLimitMiddleware } from "./middleware/rate-limit.js";
import { secretKeyAuth } from "./middleware/auth/secret-key.js";
import { healthCheckRoute } from "./routes/health.js";
import { apiReference } from "@scalar/hono-api-reference";

import { accountsRoutes } from "./routes/accounts/accounts.js";
import { openAPISpecs } from "hono-openapi";
import { accountRouter } from "./account/index.js";
import { setupQueuesUiRoutes } from "./routes/queues.js";
import { transactionsRoutes } from "./routes/transactions/index.js";
import { correlationId } from "./middleware/correlation-id.js";
import contractRoutes from "./routes/contract/index.js";
import authRoutes from "./routes/auth/index.js";

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
        {
          url: "https://engine-v3-test-instance-yl1c.engine-aws-usw2.zeet.app",
          description: "Zeet Test Instance",
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
engineServer.route("/contract", contractRoutes);
engineServer.route("/auth", authRoutes);

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
