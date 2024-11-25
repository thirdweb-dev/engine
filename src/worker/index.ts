import { chainIndexerListener } from "./listeners/chainIndexerListener";
import {
  newConfigurationListener,
  updatedConfigurationListener,
} from "./listeners/configListener";
import {
  newWebhooksListener,
  updatedWebhooksListener,
} from "./listeners/webhookListener";
import { initCancelRecycledNoncesWorker } from "./tasks/cancelRecycledNoncesWorker";
import { initMigratePostgresTransactionsWorker } from "./tasks/migratePostgresTransactionsWorker";
import { initMineTransactionWorker } from "./tasks/mineTransactionWorker";
import { initNonceHealthCheckWorker } from "./tasks/nonceHealthCheckWorker";
import { initNonceResyncWorker } from "./tasks/nonceResyncWorker";
import { initProcessEventLogsWorker } from "./tasks/processEventLogsWorker";
import { initProcessTransactionReceiptsWorker } from "./tasks/processTransactionReceiptsWorker";
import { initPruneTransactionsWorker } from "./tasks/pruneTransactionsWorker";
import { initSendTransactionWorker } from "./tasks/sendTransactionWorker";
import { initSendWebhookWorker } from "./tasks/sendWebhookWorker";

export const initWorker = async () => {
  // DEBUG
  return;

  initCancelRecycledNoncesWorker();
  initProcessEventLogsWorker();
  initProcessTransactionReceiptsWorker();
  initPruneTransactionsWorker();
  initSendTransactionWorker();
  initMineTransactionWorker();
  initSendWebhookWorker();

  initNonceHealthCheckWorker();

  await initMigratePostgresTransactionsWorker();

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
