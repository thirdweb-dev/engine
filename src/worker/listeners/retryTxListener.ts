import cron from "node-cron";
import { getConfig } from "../../utils/cache/getConfig";
import { retryTx } from "../tasks/retryTx";

let task: cron.ScheduledTask;
export const retryTxListener = async () => {
  const config = await getConfig();

  if (!config.retryTxListenerCronSchedule) {
    return;
  }

  if (task) {
    task.stop();
  }

  task = cron.schedule(config.retryTxListenerCronSchedule, async () => {
    await retryTx();
  });
};
