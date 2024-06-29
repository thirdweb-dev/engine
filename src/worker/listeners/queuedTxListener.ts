import { TX_QUEUE_PENDING, TX_QUEUE_PROCESSING } from "../../constants/queue";
import { logger } from "../../utils/logger";
import { redis } from "../../utils/redis/redis";
import { processTx } from "../tasks/processTx";

export const queuedTxListener = async (): Promise<void> => {
  logger({
    service: "worker",
    level: "info",
    message: `Listening for queued transactions`,
  });

  while (true) {
    logger({
      service: "worker",
      level: "info",
      message: "Checking for transactions to process...",
    });
    const tx = await redis.blmove(
      TX_QUEUE_PENDING,
      TX_QUEUE_PROCESSING,
      "LEFT",
      "RIGHT",
      0,
    );
    if (!tx) {
      logger({
        service: "worker",
        level: "info",
        message: "No transactions to process, 25ms sleep",
      });

      await new Promise((resolve) => setTimeout(resolve, 25));
      continue;
    }
    logger({
      service: "worker",
      level: "info",
      message: `Processing transaction: ${tx}`,
    });

    await processTx(tx);
  }
};
