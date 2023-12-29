import cron from "node-cron";
import { getConfiguration } from "../../db/configuration/getConfiguration";
import { logger } from "../../utils/logger";
import { processTx } from "../tasks/processTx";

let processTxStarted = false;
export const queuedTxListener = async (): Promise<void> => {
  logger({
    service: "worker",
    level: "info",
    message: `Listening for queued transactions`,
  });

  const config = await getConfiguration();

  if (!config.minedTxListenerCronSchedule) {
    return;
  }

  cron.schedule(config.minedTxListenerCronSchedule, async () => {
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
