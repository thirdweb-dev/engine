import cron from "node-cron";
import { getConfig } from "../../utils/cache/getConfig";
import { logger } from "../../utils/logger";
import { redis } from "../../utils/redis/redis";
import { manageChainIndexers } from "../tasks/manageChainIndexers";

let processChainIndexerStarted = false;
let task: cron.ScheduledTask;

export const chainIndexerListener = async (): Promise<void> => {
  if (!redis) {
    logger({
      service: "worker",
      level: "warn",
      message: `Chain Indexer Listener not started, Redis not available`,
    });
    return;
  }

  logger({
    service: "worker",
    level: "info",
    message: `Listening for indexed contracts`,
  });

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
        message: `manageChainIndexers already running, skipping`,
      });
    }
  });
};
