import { minedTxListener } from "./listeners/minedTxListener";
import { queuedTxListener } from "./listeners/queuedTxListener";
import { retryTxListener } from "./listeners/retryTxListener";

// TODO: CRONs should be configuration, not environment variables
const worker = async () => {
  // Listen for queued transactions to process
  await queuedTxListener();

  // Poll for transactions stuck in mempool to retry
  retryTxListener();

  // Poll for mined transactions to update database
  minedTxListener();
};

worker();
