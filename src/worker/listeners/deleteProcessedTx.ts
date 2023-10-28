import cron from "node-cron";
import { deleteTx } from "../tasks/deleteTx";

const CLEAR_QUEUED_TX_CRON_SCHEDULE = "0 0 */2 * * *";

// Deletes successfully processed transactions which were queued 24 hrs ago.
export const deleteProcessedTx = async () => {
  cron.schedule(CLEAR_QUEUED_TX_CRON_SCHEDULE, async () => {
    await deleteTx();
  });
};
