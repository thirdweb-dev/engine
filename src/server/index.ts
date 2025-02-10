import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import fastify, { type FastifyInstance } from "fastify";
import * as fs from "node:fs";
import path from "node:path";
import { URL } from "node:url";
import { clearCacheCron } from "../shared/utils/cron/clear-cache-cron.js";
import { env } from "../shared/utils/env.js";
import { logger } from "../shared/utils/logger.js";
import { metricsServer } from "../shared/utils/prometheus.js";
import { withServerUsageReporting } from "../shared/utils/usage.js";
import { updateTxListener } from "./listeners/update-tx-listener.js";
import { withAdminRoutes } from "./middleware/admin-routes.js";
import { withAuth } from "./middleware/auth.js";
import { withCors } from "./middleware/cors.js";
import { withEnforceEngineMode } from "./middleware/engine-mode.js";
import { withErrorHandler } from "./middleware/error.js";
import { withRequestLogs } from "./middleware/logs.js";
import { withOpenApi } from "./middleware/open-api.js";
import { withPrometheus } from "./middleware/prometheus.js";
import { withRateLimit } from "./middleware/rate-limit.js";
import { withSecurityHeaders } from "./middleware/security-headers.js";
import { withWebSocket } from "./middleware/websocket.js";
import { withRoutes } from "./routes/index.js";
import { writeOpenApiToFile } from "./utils/openapi.js";

// The server timeout in milliseconds.
// Source: https://fastify.dev/docs/latest/Reference/Server/#connectiontimeout
const SERVER_CONNECTION_TIMEOUT = 60_000;

const __dirname = new URL(".", import.meta.url).pathname;

interface HttpsObject {
  https: {
    key: Buffer;
    cert: Buffer;
    passphrase?: string;
  };
}

export const initServer = async () => {
  // Enables the server to run on https://localhost:PORT, if ENABLE_HTTPS is provided.
  let httpsObject: HttpsObject | undefined = undefined;
  if (env.ENABLE_HTTPS) {
    httpsObject = {
      https: {
        key: fs.readFileSync(path.join(__dirname, "../https/key.pem")),
        cert: fs.readFileSync(path.join(__dirname, "../https/cert.pem")),
        passphrase: env.HTTPS_PASSPHRASE,
      },
    };
  }

  // env.TRUST_PROXY is used to determine if the X-Forwarded-For header should be trusted.
  // This option is force enabled for cloud-hosted Engines.
  // See: https://fastify.dev/docs/latest/Reference/Server/#trustproxy
  const trustProxy = env.TRUST_PROXY || !!env.ENGINE_TIER;
  if (trustProxy) {
    logger({
      service: "server",
      level: "info",
      message: "Server is enabled with trustProxy.",
    });
  }

  // Start the server with middleware.
  const server: FastifyInstance = fastify({
    maxParamLength: 200,
    connectionTimeout: SERVER_CONNECTION_TIMEOUT,
    disableRequestLogging: true,
    trustProxy,
    ...(env.ENABLE_HTTPS ? httpsObject : {}),
  }).withTypeProvider<TypeBoxTypeProvider>();

  // Configure middleware
  withErrorHandler(server);
  withRequestLogs(server);
  withSecurityHeaders(server);
  withCors(server);
  withRateLimit(server);
  withEnforceEngineMode(server);
  withServerUsageReporting(server);
  withPrometheus(server);

  // Register routes
  await withWebSocket(server);
  await withAuth(server);
  await withOpenApi(server);
  await withRoutes(server);
  await withAdminRoutes(server);

  await server.ready();

  // if metrics are enabled, expose the metrics endpoint
  if (env.METRICS_ENABLED) {
    await metricsServer.ready();
    metricsServer.listen({
      host: env.HOST,
      port: env.METRICS_PORT,
    });
  }

  server.listen(
    {
      host: env.HOST,
      port: env.PORT,
    },
    (err) => {
      if (err) {
        logger({
          service: "server",
          level: "fatal",
          message: "Failed to start server",
          error: err,
        });
        process.exit(1);
      }
    },
  );

  const url = `${env.ENABLE_HTTPS ? "https://" : "http://"}localhost:${
    env.PORT
  }`;

  logger({
    service: "server",
    level: "info",
    message: `Engine server is listening on port ${
      env.PORT
    }. Add to your dashboard: https://thirdweb.com/dashboard/engine?importUrl=${encodeURIComponent(
      url,
    )}.`,
  });

  writeOpenApiToFile(server);
  await updateTxListener();
  await clearCacheCron("server");
};
