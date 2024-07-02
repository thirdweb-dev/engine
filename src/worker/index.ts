import { chainIndexerListener } from "./listeners/chainIndexerListener";
import {
  newConfigurationListener,
  updatedConfigurationListener,
} from "./listeners/configListener";
import { deleteProcessedTx } from "./listeners/deleteProcessedTx";
import {
  newWebhooksListener,
  updatedWebhooksListener,
} from "./listeners/webhookListener";

// Init workers.
import "./tasks/cancelTransactionWorker";
import "./tasks/confirmTransactionWorker";
import "./tasks/prepareTransactionWorker";
import "./tasks/processEventLogsWorker";
import "./tasks/processTransactionReceiptsWorker";
import "./tasks/sendTransactionWorker";
import "./tasks/sendWebhookWorker";

export const initWorker = async () => {
  // Delete completed transactions older than 24 hours.
  await deleteProcessedTx();

  // Listen for new & updated configuration data.
  await newConfigurationListener();
  await updatedConfigurationListener();

  // Listen for new & updated webhooks data.
  await newWebhooksListener();
  await updatedWebhooksListener();

  // Contract subscriptions.
  await chainIndexerListener();
};
