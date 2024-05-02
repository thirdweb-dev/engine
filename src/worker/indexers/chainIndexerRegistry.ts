import cron from "node-cron";
import { getConfig } from "../../utils/cache/getConfig";
import { env } from "../../utils/env";
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

  // Estimate block time.
  const blockTimeSeconds = await getBlockTimeSeconds(chainId);

  const blocksIn5Seconds = Math.round((1 / blockTimeSeconds) * 5);
  const maxBlocksToIndex = Math.max(
    config.maxBlocksToIndex,
    blocksIn5Seconds * 4,
  );

  // Compute block offset based on delay.
  // Example: 10s delay with a 3s block time = 4 blocks offset
  const toBlockOffset = env.CONTRACT_SUBSCRIPTIONS_DELAY_SECONDS
    ? Math.ceil(env.CONTRACT_SUBSCRIPTIONS_DELAY_SECONDS / blockTimeSeconds)
    : 0;

  const handler = await createChainIndexerTask({
    chainId,
    maxBlocksToIndex,
    toBlockOffset,
  });

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

      try {
        await handler();
      } catch (error) {
        // do nothing
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
