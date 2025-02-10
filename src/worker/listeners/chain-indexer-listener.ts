import cron from "node-cron";
import { getConfig } from "../../shared/utils/cache/get-config.js";
import { logger } from "../../shared/utils/logger.js";
import { manageChainIndexers } from "../tasks/manage-chain-indexers.js";

let processChainIndexerStarted = false;
let task: cron.ScheduledTask;

export const chainIndexerListener = async (): Promise<void> => {
  const config = await getConfig();
  if (!config.indexerListenerCronSchedule) {
    return;
  }
  if (task) {
    task.stop();
  }

  task = cron.schedule(config.indexerListenerCronSchedule, async () => {
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
};
