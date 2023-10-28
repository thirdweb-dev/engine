import { prisma } from "../../db/client";
import { logger } from "../../utils/logger";

export const deleteTx = async () => {
  try {
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    const deletedItems = await prisma.transactions.deleteMany({
      where: {
        AND: [
          {
            queuedAt: {
              lt: twentyFourHoursAgo,
            },
            processedAt: {
              not: null,
            },
          },
          {
            OR: [
              {
                minedAt: {
                  not: null,
                },
              },
              {
                cancelledAt: {
                  not: null,
                },
              },
              // Check to if the transaction Errored
              {
                errorMessage: {
                  not: null,
                },
              },
            ],
          },
        ],
      },
    });

    logger.worker.debug(`Deleted ${deletedItems?.count} transactions`);
  } catch (error) {
    logger.worker.error(error);
  }
};
