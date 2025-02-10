import "./polyfill.js";
import "./tracer.js";

import { initServer } from "./server/index.js";
import { env } from "./shared/utils/env.js";
import { logger } from "./shared/utils/logger.js";
import { initWorker } from "./worker/index.js";
import { CancelRecycledNoncesQueue } from "./worker/queues/cancel-recycled-nonces-queue.js";
import { MineTransactionQueue } from "./worker/queues/mine-transaction-queue.js";
import { NonceResyncQueue } from "./worker/queues/nonce-resync-queue.js";
import { ProcessEventsLogQueue } from "./worker/queues/process-event-logs-queue.js";
import { ProcessTransactionReceiptsQueue } from "./worker/queues/process-transaction-receipts-queue.js";
import { PruneTransactionsQueue } from "./worker/queues/prune-transactions-queue.js";
import { SendTransactionQueue } from "./worker/queues/send-transaction-queue.js";
import { SendWebhookQueue } from "./worker/queues/send-webhook-queue.js";

const main = async () => {
  if (env.ENGINE_MODE === "server_only") {
    initServer();
  } else if (env.ENGINE_MODE === "worker_only") {
    initWorker();
  } else {
    initServer();
    initWorker();
  }
};

main();

// Adding handlers for `uncaughtException` & `unhandledRejection`
// Needs to be root level of your application to ensure it
// catches any unhandledRejections or uncaughtException that occur throughout
// entire codebase

process.on("uncaughtException", (err) => {
  logger({
    message: "Uncaught Exception",
    service: "server",
    level: "error",
    error: err,
  });
});

process.on("unhandledRejection", (err) => {
  logger({
    message: "Unhandled Rejection",
    service: "server",
    level: "error",
    error: err,
  });
});

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

const gracefulShutdown = async (signal: NodeJS.Signals) => {
  logger({
    level: "info",
    service: "server",
    message: `Received ${signal}, closing server...`,
  });

  // Gracefully close workers to minimize stalled jobs.
  // Source: https://docs.bullmq.io/guide/going-to-production#gracefully-shut-down-workers
  await SendWebhookQueue.q.close();
  await ProcessEventsLogQueue.q.close();
  await ProcessTransactionReceiptsQueue.q.close();
  await SendTransactionQueue.q.close();
  await MineTransactionQueue.q.close();
  await CancelRecycledNoncesQueue.q.close();
  await PruneTransactionsQueue.q.close();
  await NonceResyncQueue.q.close();

  process.exit(0);
};
