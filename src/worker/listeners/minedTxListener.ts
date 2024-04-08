import cron from "node-cron";
import { getConfig } from "../../utils/cache/getConfig";
import { updateMinedUserOps } from "../tasks/updateMinedUserOps";

let task: cron.ScheduledTask;
export const minedTxListener = async () => {
  const config = await getConfig();

  if (!config.minedTxListenerCronSchedule) {
    return;
  }

  if (task) {
    task.stop();
  }

  task = cron.schedule(config.minedTxListenerCronSchedule, async () => {
    await updateMinedUserOps();
  });
};
