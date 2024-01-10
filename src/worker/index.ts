import { WebhooksEventTypes } from "../schema/webhooks";
import { getWebhook } from "../utils/cache/getWebhook";
import { bundlerUserOpListener } from "./listeners/bundleUserOpListener";
import {
  newConfigurationListener,
  updatedConfigurationListener,
} from "./listeners/configListener";
import { deleteProcessedTx } from "./listeners/deleteProcessedTx";
import { minedTxListener } from "./listeners/minedTxListener";
import { queuedTxListener } from "./listeners/queuedTxListener";
import { retryTxListener } from "./listeners/retryTxListener";
import { updateTxListener } from "./listeners/updateTxListener";
import {
  newWebhooksListener,
  updatedWebhooksListener,
} from "./listeners/webhookListener";

const worker = async () => {
  // Listen for queued transactions to process
  await queuedTxListener();

  // Listen for transaction updates to send webhooks
  await updateTxListener();

  // Poll for transactions stuck in mempool to retry
  await retryTxListener();

  // Poll for mined transactions to update database
  await minedTxListener();

  // Poll for user operations to bundle
  await bundlerUserOpListener();

  // Delete Successfully Processed Transactions which are older than 24 hours
  await deleteProcessedTx();

  // Listen for new & updated configuration data
  await newConfigurationListener();
  await updatedConfigurationListener();

  // Listen for new & updated webhooks data
  await newWebhooksListener();
  await updatedWebhooksListener();

  for (const eventType of Object.values(WebhooksEventTypes)) {
    await getWebhook(eventType, false);
  }
};

worker();
