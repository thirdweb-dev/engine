import cron from "node-cron";
import { getConfig } from "../../utils/cache/getConfig";
import { logger } from "../../utils/logger";
import { processTx } from "../tasks/processTx";

let processTxStarted = false;
let task: cron.ScheduledTask;

// @deprecated
export const queuedTxListener = async (): Promise<void> => {
  logger({
    service: "worker",
    level: "info",
    message: `Listening for queued transactions`,
  });

  const config = await getConfig();

  if (!config.minedTxListenerCronSchedule) {
    return;
  }
  if (task) {
    task.stop();
  }

  task = cron.schedule(config.minedTxListenerCronSchedule, async () => {
    if (!processTxStarted) {
      processTxStarted = true;
      await processTx();
      processTxStarted = false;
    } else {
      logger({
        service: "worker",
        level: "warn",
        message: `processTx already running, skipping`,
      });
    }
  });
};
