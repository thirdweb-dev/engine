import { chainIndexerListener } from "./listeners/chainIndexerListener";
import {
  newConfigurationListener,
  updatedConfigurationListener,
} from "./listeners/configListener";
import { deleteProcessedTx } from "./listeners/deleteProcessedTx";
import { minedTxListener } from "./listeners/minedTxListener";
import { queuedTxListener } from "./listeners/queuedTxListener";
import { retryTxListener } from "./listeners/retryTxListener";
import { startIngestQueueWorker } from "./tasks/ingestQueueWorker";
import { processWebhook } from "./tasks/processWebhook";

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
  // await newWebhooksListener();
  // await updatedWebhooksListener();

  await startIngestQueueWorker();
  await processWebhook();

  await chainIndexerListener();
};
