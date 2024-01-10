import cron from "node-cron";
import { getConfig } from "../../utils/cache/getConfig";
import { logger } from "../../utils/logger";
import { bundleUserOps } from "../tasks/bundleUserOps";

let bundlerStarted = false;
let task: cron.ScheduledTask;

export const bundlerUserOpListener = async (): Promise<void> => {
  logger({
    service: "worker",
    level: "info",
    message: "Listening for user operations to bundle",
  });

  const config = await getConfig();
  if (!config.minedTxListenerCronSchedule) {
    return;
  }

  if (task) {
    task.stop();
  }

  task = cron.schedule(config.minedTxListenerCronSchedule, async () => {
    if (!bundlerStarted) {
      bundlerStarted = true;
      await bundleUserOps();
      bundlerStarted = false;
    } else {
      logger({
        service: "worker",
        level: "warn",
        message: `processTx already running, skipping`,
      });
    }
  });
};
