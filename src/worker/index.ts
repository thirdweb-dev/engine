import { logger } from "../utils/logger";
import { redis } from "../utils/redis/redis";
import { chainIndexerListener } from "./listeners/chainIndexerListener";
import {
  newConfigurationListener,
  updatedConfigurationListener,
} from "./listeners/configListener";
import { deleteProcessedTx } from "./listeners/deleteProcessedTx";
import { minedTxListener } from "./listeners/minedTxListener";
import { queuedTxListener } from "./listeners/queuedTxListener";
import { retryTxListener } from "./listeners/retryTxListener";
import {
  newWebhooksListener,
  updatedWebhooksListener,
} from "./listeners/webhookListener";
import "./tasks/processEventLogsWorker";
import "./tasks/processTransactionReceiptsWorker";
import "./tasks/sendWebhookWorker";

export const initWorker = async () => {
  // Listen for queued transactions to process
  await queuedTxListener();

  // Poll for transactions stuck in mempool to retry
  await retryTxListener();

  // Poll for mined transactions to update database
  await minedTxListener();

  // Delete Successfully Processed Transactions which are older than 24 hours
  await deleteProcessedTx();

  // Listen for new & updated configuration data
  await newConfigurationListener();
  await updatedConfigurationListener();

  // Listen for new & updated webhooks data
  await newWebhooksListener();
  await updatedWebhooksListener();

  if (redis) {
    await chainIndexerListener();
  } else {
    logger({
      service: "worker",
      level: "warn",
      message: `Chain Indexer Listener not started, Redis not available`,
    });
  }
};
