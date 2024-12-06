import cron from "node-cron";
import { clearCache } from "../cache/clearCache";
import { getConfig } from "../cache/getConfig";
import { env } from "../env";

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
