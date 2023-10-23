import { deleteProcessedTx } from "./listeners/deleteProcessedTx";
import { minedTxListener } from "./listeners/minedTxListener";
import { queuedTxListener } from "./listeners/queuedTxListener";
import { retryTxListener } from "./listeners/retryTxListener";

const worker = async () => {
  // Listen for queued transactions to process
  await queuedTxListener();

  // Poll for transactions stuck in mempool to retry
  await retryTxListener();

  // Poll for mined transactions to update database
  await minedTxListener();

  // Delete Successfully Processed Transactions which are older than 24 hours
  await deleteProcessedTx();
};

worker();
