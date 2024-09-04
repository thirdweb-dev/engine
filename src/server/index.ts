import { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import fastify, { FastifyInstance } from "fastify";
import * as fs from "fs";
import path from "path";
import { URL } from "url";
import { clearCacheCron } from "../utils/cron/clearCacheCron";
import { env } from "../utils/env";
import { logger } from "../utils/logger";
import { withServerUsageReporting } from "../utils/usage";
import { updateTxListener } from "./listeners/updateTxListener";
import { withAdminRoutes } from "./middleware/adminRoutes";
import { withAuth } from "./middleware/auth";
import { withCors } from "./middleware/cors";
import { withEnforceEngineMode } from "./middleware/engineMode";
import { withErrorHandler } from "./middleware/error";
import { withExpress } from "./middleware/express";
import { withRequestLogs } from "./middleware/logs";
import { withOpenApi } from "./middleware/open-api";
import { withPrometheus } from "./middleware/prometheus";
import { withRateLimit } from "./middleware/rateLimit";
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

  // Start the server with middleware.
  const server: FastifyInstance = fastify({
    connectionTimeout: SERVER_CONNECTION_TIMEOUT,
    disableRequestLogging: true,
    // env.TRUST_PROXY is used to determine if the X-Forwarded-For header should be trusted.
    // See: https://fastify.dev/docs/latest/Reference/Server/#trustproxy
    trustProxy: env.TRUST_PROXY,
    ...(env.ENABLE_HTTPS ? httpsObject : {}),
  }).withTypeProvider<TypeBoxTypeProvider>();

  server.decorateRequest("corsPreflightEnabled", false);

  await withCors(server);
  await withRequestLogs(server);
  await withPrometheus(server);
  await withErrorHandler(server);
  await withEnforceEngineMode(server);
  await withRateLimit(server);
  await withWebSocket(server);
  await withAuth(server);
  await withExpress(server);
  await withOpenApi(server);
  await withRoutes(server);
  await withServerUsageReporting(server);
  await withAdminRoutes(server);

  await server.ready();

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
          message: `Failed to start server`,
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
