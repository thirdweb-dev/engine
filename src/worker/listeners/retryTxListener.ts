import cron from "node-cron";
import { env } from "../../../core/env";
import { logger } from "../../utils/logger";
import { retryTx } from "../tasks/retryTx";

export const retryTxListener = () => {
  cron.schedule(env.RETRY_TX_CRON_SCHEDULE, async () => {
    if (!env.RETRY_TX_ENABLED) {
      return;
    }

    try {
      await retryTx();
    } catch (err) {
      logger.worker.error(`Failed to retry transaction:\n${err}`);
      return;
    }
  });
};
