import cron from "node-cron";
import { getConfig } from "../../utils/cache/getConfig";
import { getBlockTimeSeconds } from "../../utils/indexer/getBlockTime";
import { logger } from "../../utils/logger";
import { createChainIndexerTask } from "../tasks/chainIndexer";

export const INDEXER_REGISTRY = {} as Record<number, cron.ScheduledTask>;

export const addChainIndexer = async (chainId: number) => {
  if (INDEXER_REGISTRY[chainId]) {
    logger({
      service: "worker",
      level: "warn",
      message: `Chain Indexer already exists: ${chainId}`,
    });
    return;
  }

  let processStarted = false;
  const config = await getConfig();
  const blockTimeSeconds = await getBlockTimeSeconds(chainId);

  const blocksIn5Seconds = Math.round((1 / blockTimeSeconds) * 5);
  const maxBlocksToIndex = Math.max(
    config.maxBlocksToIndex,
    blocksIn5Seconds * 4,
  );

  const handler = await createChainIndexerTask(chainId, maxBlocksToIndex);

  const cronSchedule = createScheduleSeconds(
    Math.max(Math.round(blockTimeSeconds), 1),
  );

  logger({
    service: "worker",
    level: "info",
    message: `Indexing contracts on chainId: ${chainId} with schedule: ${cronSchedule}, max blocks to index: ${maxBlocksToIndex}`,
  });

  const task = cron.schedule(cronSchedule, async () => {
    if (!processStarted) {
      processStarted = true;
      const startTime = performance.now();

      try {
        await handler();
      } catch (error) {
        // do nothing
      } finally {
        processStarted = false;
        const endTime = performance.now();
        const executionTime = endTime - startTime;
        logger({
          service: "worker",
          level: "info",
          message: `Indexing completed for chainId: ${chainId}. Execution time: ${executionTime} ms`,
        });
      }
    }
  });

  INDEXER_REGISTRY[chainId] = task;
};

export const removeChainIndexer = async (chainId: number) => {
  const task = INDEXER_REGISTRY[chainId];

  if (!task) {
    logger({
      service: "worker",
      level: "warn",
      message: `Chain Indexer doesn't exist: ${chainId}`,
    });
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
