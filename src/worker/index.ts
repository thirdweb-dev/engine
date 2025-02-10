import { chainIndexerListener } from "./listeners/chain-indexer-listener.js";
import {
  newConfigurationListener,
  updatedConfigurationListener,
} from "./listeners/config-listener.js";
import {
  newWebhooksListener,
  updatedWebhooksListener,
} from "./listeners/webhook-listener.js";
import { initCancelRecycledNoncesWorker } from "./tasks/cancel-recycled-nonces-worker.js";
import { initMineTransactionWorker } from "./tasks/mine-transaction-worker.js";
import { initNonceHealthCheckWorker } from "./tasks/nonce-health-check-worker.js";
import { initNonceResyncWorker } from "./tasks/nonce-resync-worker.js";
import { initProcessEventLogsWorker } from "./tasks/process-event-logs-worker.js";
import { initProcessTransactionReceiptsWorker } from "./tasks/process-transaction-receipts-worker.js";
import { initPruneTransactionsWorker } from "./tasks/prune-transactions-worker.js";
import { initSendTransactionWorker } from "./tasks/send-transaction-worker.js";
import { initSendWebhookWorker } from "./tasks/send-webhook-worker.js";

export const initWorker = async () => {
  initCancelRecycledNoncesWorker();
  initProcessEventLogsWorker();
  initProcessTransactionReceiptsWorker();
  initPruneTransactionsWorker();
  initSendTransactionWorker();
  initMineTransactionWorker();
  initSendWebhookWorker();

  initNonceHealthCheckWorker();

  await initNonceResyncWorker();

  // Listen for new & updated configuration data.
  await newConfigurationListener();
  await updatedConfigurationListener();

  // Listen for new & updated webhooks data.
  await newWebhooksListener();
  await updatedWebhooksListener();

  // Contract subscriptions.
  await chainIndexerListener();
};
