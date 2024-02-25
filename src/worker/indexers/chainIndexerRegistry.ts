import cron from "node-cron";
import { getBlockTimeSeconds } from "../../utils/indexer/getBlockTime";
import { logger } from "../../utils/logger";
import { createChainIndexerTask } from "./chainIndexer";

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
  console.log("Getting the block Time");
  const blockTimeSeconds = await getBlockTimeSeconds(chainId);
  const handler = await createChainIndexerTask(chainId);
  console.log("creating indexer");

  const cronSchedule = createScheduleSeconds(blockTimeSeconds);

  logger({
    service: "worker",
    level: "info",
    message: `Indexing contracts on chainId: ${chainId} with schedule: ${cronSchedule}`,
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
    } else {
      logger({
        service: "worker",
        level: "warn",
        message: `processIndex: ${chainId} already running, skipping`,
      });
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
