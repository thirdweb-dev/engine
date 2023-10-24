import { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import fastify, { FastifyInstance } from "fastify";
import { env } from "../src/utils/env";
import { logger } from "../src/utils/logger";
import { withRoutes } from "./api";
import { startTxUpdatesNotificationListener } from "./controller/tx-update-listener";
import { withAuth } from "./middleware/auth";
import { withCors } from "./middleware/cors";
import { withErrorHandler } from "./middleware/error";
import { withExpress } from "./middleware/express";
import { withRequestLogs } from "./middleware/logs";
import { withOpenApi } from "./middleware/open-api";

const main = async () => {
  const server: FastifyInstance = fastify({
    logger: logger.server,
    disableRequestLogging: true,
  }).withTypeProvider<TypeBoxTypeProvider>();

  await withCors(server);
  await withRequestLogs(server);
  await withErrorHandler(server);
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
        logger.server.error(err);
        process.exit(1);
      }
    },
  );

  await startTxUpdatesNotificationListener();
};

main();
