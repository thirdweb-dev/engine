import cron from "node-cron";
import { clearCache } from "../cache/clear-cache.js";
import { getConfig } from "../cache/get-config.js";
import type { env } from "../env.js";

let task: cron.ScheduledTask;
export const clearCacheCron = async (
  service: (typeof env)["LOG_SERVICES"][0],
) => {
  const config = await getConfig();

  if (!config.clearCacheCronSchedule) {
    return;
  }

  if (task) {
    task.stop();
  }

  task = cron.schedule(config.clearCacheCronSchedule, async () => {
    await clearCache(service);
  });
};
