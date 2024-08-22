import { chainIndexerListener } from "./listeners/chainIndexerListener";
import {
  newConfigurationListener,
  updatedConfigurationListener,
} from "./listeners/configListener";
import { pruneCompletedTransactions } from "./listeners/deleteProcessedTx";
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

  // Delete completed transactions after some age.
  await pruneCompletedTransactions();

  // Listen for new & updated configuration data
  await newConfigurationListener();
  await updatedConfigurationListener();

  // Listen for new & updated webhooks data
  await newWebhooksListener();
  await updatedWebhooksListener();

  await chainIndexerListener();
};
