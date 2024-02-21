import cron from "node-cron";
import { getConfig } from "../../utils/cache/getConfig";
import { logger } from "../../utils/logger";
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
    if (!minedTxStarted) {
      minedTxStarted = true;
      await updateMinedTx();
      await updateMinedUserOps();
      minedTxStarted = false;
    } else {
      logger({
        service: "worker",
        level: "warn",
        message: "Mined tx listener already running, skipping",
      });
    }
  });
};
