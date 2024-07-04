import { chainIndexerListener } from "./listeners/chainIndexerListener";
import {
  newConfigurationListener,
  updatedConfigurationListener,
} from "./listeners/configListener";
import {
  newWebhooksListener,
  updatedWebhooksListener,
} from "./listeners/webhookListener";

// Init workers.
import "./tasks/cancelTransactionWorker";
import "./tasks/mineTransactionWorker";
import "./tasks/processEventLogsWorker";
import "./tasks/processTransactionReceiptsWorker";
import "./tasks/sendTransactionWorker";
import "./tasks/sendWebhookWorker";

export const initWorker = async () => {
  // Listen for new & updated configuration data.
  await newConfigurationListener();
  await updatedConfigurationListener();

  // Listen for new & updated webhooks data.
  await newWebhooksListener();
  await updatedWebhooksListener();

  // Contract subscriptions.
  await chainIndexerListener();
};
