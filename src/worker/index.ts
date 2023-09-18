import { minedTxListener } from "./listeners/minedTxListener";
import { queuedTxListener } from "./listeners/queuedTxListener";
import { retryTxListener } from "./listeners/retryTxListener";

const worker = async () => {
  await queuedTxListener();
  retryTxListener();
  minedTxListener();
};

worker();
