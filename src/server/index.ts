import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import fastify, { type FastifyInstance } from "fastify";
import * as fs from "node:fs";
import path from "node:path";
import { URL } from "node:url";
import { getConfig } from "../utils/cache/getConfig";
import { clearCacheCron } from "../utils/cron/clearCacheCron";
import { env } from "../utils/env";
import { logger } from "../utils/logger";
import { metricsServer } from "../utils/prometheus";
import { withServerUsageReporting } from "../utils/usage";
import { updateTxListener } from "./listeners/updateTxListener";
import { withAdminRoutes } from "./middleware/adminRoutes";
import { withAuth } from "./middleware/auth";
import { withCors } from "./middleware/cors";
import { withEnforceEngineMode } from "./middleware/engineMode";
import { withErrorHandler } from "./middleware/error";
import { withRequestLogs } from "./middleware/logs";
import { withOpenApi } from "./middleware/openApi";
import { withPrometheus } from "./middleware/prometheus";
import { withRateLimit } from "./middleware/rateLimit";
import { withSecurityHeaders } from "./middleware/securityHeaders";
import { withWebSocket } from "./middleware/websocket";
import { withRoutes } from "./routes";
import { writeOpenApiToFile } from "./utils/openapi";

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

  const config = await getConfig();

  // Configure middleware
  withErrorHandler(server);
  withRequestLogs(server);
  withSecurityHeaders(server);
  withCors(server, config);
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
