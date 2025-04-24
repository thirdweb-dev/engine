import { CronJob } from "cron";
import { clearCache } from "../cache/clear-cache";
import { getConfig } from "../cache/get-config";

let task: CronJob;

export const clearCacheCron = async () => {
  const config = await getConfig();

  if (!config.clearCacheCronSchedule) {
    return;
  }

  // Stop the existing task if it exists.
  if (task) {
    task.stop();
  }

  task = new CronJob(config.clearCacheCronSchedule, async () => {
    await clearCache();
  });
  task.start();
};
