import cron from "node-cron";
import { prettifyError } from "../../utils/error";
import { getBlockTimeSeconds } from "../../utils/indexer/getBlockTime";
import { logger } from "../../utils/logger";
import { createChainIndexerTask } from "../tasks/chainIndexer";

// @TODO: Move all worker logic to Bullmq to better handle multiple hosts.
export const INDEXER_REGISTRY = {} as Record<number, cron.ScheduledTask>;

export const addChainIndexer = async (chainId: number) => {
  if (INDEXER_REGISTRY[chainId]) {
    console.log("[DEBUG] AAA");
    return;
  }

  let processStarted = false;

  console.log("[DEBUG] BBB");
  const handler = await createChainIndexerTask(chainId);

  console.log("[DEBUG] CCCC");

  // Estimate the block time in the last 100 blocks.
  const blockTimeSeconds = await getBlockTimeSeconds(chainId, 100);
  console.log("[DEBUG] DDD", blockTimeSeconds);
  const cronSchedule = createScheduleSeconds(
    Math.max(Math.round(blockTimeSeconds), 1),
  );
  console.log("[DEBUG] cronSchedule", cronSchedule);
  logger({
    service: "worker",
    level: "info",
    message: `Indexing contracts on chain ${chainId} with schedule: ${cronSchedule}, max blocks to index: ${maxBlocksToIndex}`,
  });

  const task = cron.schedule(cronSchedule, async () => {
    if (!processStarted) {
      processStarted = true;

      try {
        await handler();
      } catch (e) {
        logger({
          service: "worker",
          level: "error",
          message: prettifyError(e),
        });
      } finally {
        processStarted = false;
      }
    }
  });

  INDEXER_REGISTRY[chainId] = task;
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

export const createScheduleSeconds = (seconds: number) =>
  `*/${seconds} * * * * *`;
