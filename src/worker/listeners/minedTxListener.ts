import cron from "node-cron";
import { getConfig } from "../../utils/cache/getConfig";
import { updateMinedTx } from "../tasks/updateMinedTx";
import { updateMinedUserOps } from "../tasks/updateMinedUserOps";

let task: cron.ScheduledTask;
let minedTxStarted = false;
export const minedTxListener = async () => {
  const config = await getConfig();

  if (!config.minedTxListenerCronSchedule) {
    return;
  }

  if (task) {
    task.stop();
  }

  task = cron.schedule(config.minedTxListenerCronSchedule, async () => {
    await updateMinedTx();
    await updateMinedUserOps();
  });
};
