import { logger } from "../utils/logger";
import { deleteProcessedTx } from "./listeners/deleteProcessedTx";
import { minedTxListener } from "./listeners/minedTxListener";
import { queuedTxListener } from "./listeners/queuedTxListener";
import { retryTxListener } from "./listeners/retryTxListener";
import { updateTxListener } from "./listeners/updateTxListener";

const worker = async () => {
  // Listen for queued transactions to process
  await queuedTxListener();

  // Listen for transaction updates to send webhooks
  await updateTxListener();

  // Poll for transactions stuck in mempool to retry
  await retryTxListener();

  // Poll for mined transactions to update database
  await minedTxListener();

  // Delete Successfully Processed Transactions which are older than 24 hours
  await deleteProcessedTx();
};

worker();

process.on("unhandledRejection", (err) => {
  logger({
    service: "worker",
    level: "fatal",
    message: `unhandledRejection`,
    error: err,
  });

  worker();
});

process.on("uncaughtException", (err) => {
  logger({
    service: "worker",
    level: "fatal",
    message: `uncaughtException`,
    error: err,
  });

  worker();
});
