import { chainIndexerListener } from "./listeners/chain-indexer-listener";
import {
  newConfigurationListener,
  updatedConfigurationListener,
} from "./listeners/config-listener";
import { initCancelRecycledNoncesWorker } from "./tasks/cancel-recycled-nonces-worker";
import { initMineTransactionWorker } from "./tasks/mine-transaction-worker";
import { initNonceHealthCheckWorker } from "./tasks/nonce-health-check-worker";
import { initNonceResyncWorker } from "./tasks/nonce-resync-worker";
import { initProcessEventLogsWorker } from "./tasks/process-event-logs-worker";
import { initProcessTransactionReceiptsWorker } from "./tasks/process-transaction-receipts-worker";
import { initPruneTransactionsWorker } from "./tasks/prune-transactions-worker";
import { initSendTransactionWorker } from "./tasks/send-transaction-worker";
import { initSendWebhookWorker } from "./tasks/send-webhook-worker";
import { initWalletSubscriptionWorker } from "./tasks/wallet-subscription-worker";

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
  await initWalletSubscriptionWorker();

  // Contract subscriptions.
  await chainIndexerListener();
};
