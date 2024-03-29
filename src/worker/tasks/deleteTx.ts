import { prisma } from "../../db/client";
import { logger } from "../../utils/logger";

export const deleteTx = async () => {
  try {
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    const deletedItems = await prisma.transactions.deleteMany({
      where: {
        // All txs queued 24+ hours ago that are mined, cancelled, or errored.
        AND: [
          {
            queuedAt: {
              lt: twentyFourHoursAgo,
            },
          },
          {
            OR: [
              {
                minedAt: { not: null },
              },
              {
                cancelledAt: { not: null },
              },
              {
                errorMessage: { not: null },
              },
            ],
          },
        ],
      },
    });

    logger({
      service: "worker",
      level: "debug",
      message: `Deleted ${deletedItems?.count} transactions`,
    });
  } catch (error) {
    logger({
      service: "worker",
      level: "error",
      message: `Failed to delete transactions`,
      error,
    });
  }
};
