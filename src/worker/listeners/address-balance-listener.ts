import cron from "node-cron";
import { getConfig } from "../../shared/utils/cache/get-config";
import { logger } from "../../shared/utils/logger";
import { trackAddressBalance } from "../tasks/track-address-balance";

let isLocked = false;
let task: cron.ScheduledTask;

/**
 * Tracks balance of address and calls webhook if reaches a threshold.
 * Caveat: high chance of balance going under threshold for fast chains. Doesn't scale well for large amount of addresses.
 *
 * Optimization: stream transactions via websocket and filter by from/to address for balance transfers.
 */
export const addressBalanceListener = async (): Promise<void> => {
  const config = await getConfig();
  if (!config.addressBalanceListenerCronSchedule) {
    return;
  }
  if (task) {
    task.stop();
  }

  task = cron.schedule(config.addressBalanceListenerCronSchedule, async () => {
    if (!isLocked) {
      isLocked = true;
      await trackAddressBalance();
      isLocked = false;
    } else {
      logger({
        service: "worker",
        level: "warn",
        message: "trackAddressBalance already running, skipping",
      });
    }
  });
};
