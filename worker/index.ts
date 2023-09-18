import * as cron from "node-cron";
import { env } from "../core";
import { logger } from "../src/utils/logger";
import { checkForMinedTransactionsOnBlockchain } from "./controller/blockchainReader";
import { startNotificationListener } from "./controller/listener";
import { retryTransactions } from "./controller/retryTransaction";

const MINED_TX_CRON_SCHEDULE = env.MINED_TX_CRON_SCHEDULE;
const RETRY_TX_CRON_SCHEDULE = env.RETRY_TX_CRON_SCHEDULE;

const main = async () => {
  try {
    // Start Listening to the Table for new insertion
    await retryWithTimeout(() => startNotificationListener(), 3, 5000);
  } catch (error) {
    logger.worker.error(error);
    process.exit(1);
  }
  // setup a cron job to updated transaction confirmed status
  cron.schedule(MINED_TX_CRON_SCHEDULE, async () => {
    await checkForMinedTransactionsOnBlockchain();
  });

  cron.schedule(RETRY_TX_CRON_SCHEDULE, async () => {
    await retryTransactions();
  });
};

// Retry logic with timeout
const retryWithTimeout = async (
  fn: () => Promise<any>,
  retries: number,
  timeout: number,
): Promise<any> => {
  try {
    logger.worker.info("Trying to connect to the database");
    return await fn();
  } catch (error) {
    logger.worker.info(
      `Retries left: ${retries}, every ${timeout / 1000} seconds`,
    );
    if (retries > 0) {
      await new Promise((resolve) => setTimeout(resolve, timeout));
      return await retryWithTimeout(fn, retries - 1, timeout);
    } else {
      throw new Error(
        "Maximum retries exceeded. Unable to recover from the error.",
      );
    }
  }
};

main();
