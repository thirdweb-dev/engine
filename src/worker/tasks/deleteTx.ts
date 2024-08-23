import { prisma } from "../../db/client";
import { logger } from "../../utils/logger";

export const deleteTx = async (maxAgeDays: number) => {
  try {
    const deleteBefore = new Date();
    deleteBefore.setDate(deleteBefore.getDate() - maxAgeDays);

    const deletedItems = await prisma.transactions.deleteMany({
      where: {
        AND: [
          {
            queuedAt: { lt: deleteBefore },
          },
          {
            OR: [
              { minedAt: { not: null } },
              { cancelledAt: { not: null } },
              { errorMessage: { not: null } },
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
