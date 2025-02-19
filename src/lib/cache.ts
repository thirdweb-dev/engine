import cron from "node-cron";
import { config, refreshConfig } from "./config";

function secondsToCron(seconds: number) {
  return `*/${Math.floor(seconds / 60)} * * * *`;
}

let task: cron.ScheduledTask | undefined = undefined;

export async function initiateCacheClearTask() {
  const cacheClearRegistry = [refreshConfig];

  if (task) {
    task.stop();
  }

  task = cron.schedule(
    secondsToCron(config.cacheClearIntervalSeconds),
    async () => {
      await Promise.all(cacheClearRegistry.map((fn) => fn()));
    },
  );
}
