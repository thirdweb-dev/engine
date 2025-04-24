import { getBlockTimeSeconds } from "../../shared/utils/indexer/get-block-time";
import { logger } from "../../shared/utils/logger";
import { handleContractSubscriptions } from "../tasks/chain-indexer";
import { env } from "../../shared/utils/env";
import { CronJob } from "cron";

// @TODO: Move all worker logic to Bullmq to better handle multiple hosts.
export const INDEXER_REGISTRY: Record<number, CronJob> = {};

export const addChainIndexer = async (chainId: number) => {
  if (INDEXER_REGISTRY[chainId]) {
    return;
  }

  let cronSchedule = env.CONTRACT_SUBSCRIPTION_CRON_SCHEDULE_OVERRIDE;
  if (!cronSchedule) {
    // Estimate the block time in the last 100 blocks. Default to 2 second block times.
    let blockTimeSeconds: number;
    try {
      blockTimeSeconds = await getBlockTimeSeconds(chainId, 100);
    } catch (error) {
      logger({
        service: "worker",
        level: "error",
        message: `Could not estimate block time for chain ${chainId}`,
        error,
      });
      blockTimeSeconds = 2;
    }
    cronSchedule = createScheduleSeconds(blockTimeSeconds);
  }
  logger({
    service: "worker",
    level: "info",
    message: `Indexing contracts on chain ${chainId} with schedule: ${cronSchedule}`,
  });

  let inProgress = false;

  const task = new CronJob(cronSchedule, async () => {
    if (inProgress) {
      return;
    }

    inProgress = true;
    try {
      await handleContractSubscriptions(chainId);
    } catch (error) {
      logger({
        service: "worker",
        level: "error",
        message: `Failed to index on chain ${chainId}`,
        error,
      });
    } finally {
      inProgress = false;
    }
  });

  INDEXER_REGISTRY[chainId] = task;
  task.start();
};

export const removeChainIndexer = async (chainId: number) => {
  const task = INDEXER_REGISTRY[chainId];
  if (!task) {
    return;
  }

  logger({
    service: "worker",
    level: "info",
    message: `Removing chain indexer for chainId: ${chainId}`,
  });

  task.stop();
  delete INDEXER_REGISTRY[chainId];
};

function createScheduleSeconds(blockTimeSeconds: number) {
  const pollIntervalSeconds = Math.max(Math.round(blockTimeSeconds), 2);
  return `*/${pollIntervalSeconds} * * * * *`;
}
