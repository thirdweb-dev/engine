import "./lib/datadog.js";
import "zod-openapi/extend";

import "./db/apply-migrations.js";
import { initiateCacheClearTask } from "./lib/cache.js";
import { initiateEngineServer } from "./server/engine.js";

initiateCacheClearTask();

// start the engine server

// start the metrics server
import "./server/metrics.js";
import { defaultLogger } from "./lib/logger.js";

initiateEngineServer();

const gracefulShutdown = async (signal: NodeJS.Signals) => {
  defaultLogger.info(`Received ${signal}, closing server...`);

  // Gracefully close workers to minimize stalled jobs.
  // Source: https://docs.bullmq.io/guide/going-to-production#gracefully-shut-down-workers

  process.exit(0);
};

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
