import cron from "node-cron";
import { env } from "../../utils/env";
import { retryTx } from "../tasks/retryTx";

export const retryTxListener = () => {
  cron.schedule(env.RETRY_TX_CRON_SCHEDULE, async () => {
    if (!env.RETRY_TX_ENABLED) {
      return;
    }

    await retryTx();
  });
};
