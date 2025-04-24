import { CronJob } from "cron";
import { getConfig } from "../../shared/utils/cache/get-config";
import { logger } from "../../shared/utils/logger";
import { manageChainIndexers } from "../tasks/manage-chain-indexers";

let processChainIndexerStarted = false;
let task: CronJob;

export const chainIndexerListener = async (): Promise<void> => {
  const config = await getConfig();
  if (!config.indexerListenerCronSchedule) {
    return;
  }

  // Stop the existing task if it exists.
  if (task) {
    task.stop();
  }

  task = new CronJob(config.indexerListenerCronSchedule, async () => {
    if (!processChainIndexerStarted) {
      processChainIndexerStarted = true;
      await manageChainIndexers();
      processChainIndexerStarted = false;
    } else {
      logger({
        service: "worker",
        level: "warn",
        message: "manageChainIndexers already running, skipping",
      });
    }
  });
  task.start();
};
