import cron from "node-cron";
import { env } from "../../utils/env";
import { deleteTx } from "../tasks/deleteTx";

const CLEAR_QUEUED_TX_CRON_SCHEDULE = "0 0 */2 * * *";

export const pruneCompletedTransactions = async () => {
  if (env.PRUNE_TRANSACTIONS > 0) {
    cron.schedule(CLEAR_QUEUED_TX_CRON_SCHEDULE, async () => {
      await deleteTx(env.PRUNE_TRANSACTIONS);
    });
  }
};
