import { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import fastify, { FastifyInstance } from "fastify";
import * as fs from "fs";
import path from "path";
import { URL } from "url";
import { deleteAllWalletNonces } from "../db/wallets/deleteAllWalletNonces";
import { clearCacheCron } from "../utils/cron/clearCacheCron";
import { env } from "../utils/env";
import {
  handleUncaughtExceptions,
  handleUncaughtRejections,
} from "../utils/errorHandler";
import { logger } from "../utils/logger";
import { updateTxListener } from "./listerners/updateTxListener";
import { withAuth } from "./middleware/auth";
import { withCors } from "./middleware/cors";
import { withErrorHandler } from "./middleware/error";
import { withExpress } from "./middleware/express";
import { withRequestLogs } from "./middleware/logs";
import { withOpenApi } from "./middleware/open-api";
import { withWebSocket } from "./middleware/websocket";
import { withRoutes } from "./routes";
import { writeOpenApiToFile } from "./utils/openapi";

const __dirname = new URL(".", import.meta.url).pathname;

interface HttpsObject {
  https: {
    key: Buffer;
    cert: Buffer;
    passphrase?: string;
  };
}

const main = async () => {
  // Reset any server state that is safe to reset.
  // This allows the server to start in a predictable state.
  await deleteAllWalletNonces({});

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
    disableRequestLogging: true,
    ...(env.ENABLE_HTTPS ? httpsObject : {}),
  }).withTypeProvider<TypeBoxTypeProvider>();

  server.decorateRequest("corsPreflightEnabled", false);

  await withCors(server);
  await withRequestLogs(server);
  await withErrorHandler(server);
  await withWebSocket(server);
  await withAuth(server);
  await withExpress(server);
  await withOpenApi(server);
  await withRoutes(server);

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

  logger({
    service: "server",
    level: "info",
    message: `Listening on ${env.ENABLE_HTTPS ? "https://" : "http://"}${
      env.HOST
    }:${env.PORT}`,
  });

  writeOpenApiToFile(server);
  await updateTxListener();
  await clearCacheCron("server");
  handleUncaughtExceptions("server");
  handleUncaughtRejections("server");
};

main();
