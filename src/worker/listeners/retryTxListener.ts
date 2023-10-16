import cron from "node-cron";
import { getConfiguration } from "../../db/configuration/getConfiguration";
import { retryTx } from "../tasks/retryTx";

export const retryTxListener = async () => {
  const config = await getConfiguration();

  if (!config.retryTxListenerCronSchedule) {
    return;
  }

  cron.schedule(config.retryTxListenerCronSchedule, async () => {
    await retryTx();
  });
};
