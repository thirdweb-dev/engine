import cron from "node-cron";
import { env } from "../../utils/env";
import { updateMinedTx } from "../tasks/updateMinedTx";

export const minedTxListener = () => {
  cron.schedule(env.MINED_TX_CRON_SCHEDULE, async () => {
    if (!env.MINED_TX_CRON_ENABLED) {
      return;
    }

    await updateMinedTx();
  });
};
