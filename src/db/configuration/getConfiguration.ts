import { Configuration } from "@prisma/client";
import { prisma } from "../client";

export const getConfiguration = async (): Promise<Configuration> => {
  const config = await prisma.configuration.findFirst();

  if (config) {
    // If we have a configuration object already setup, use it directly
    return config;
  }

  // Here we set all our defaults when first creating the configuration
  return prisma.configuration.create({
    data: {
      minTxsToProcess: 1,
      maxTxsToProcess: 10,
      minedTxListenerCronSchedule: "*/5 * * * * *",
      maxTxsToUpdate: 50,
      retryTxListenerCronSchedule: "*/30 * * * * *",
      minEllapsedBlocksBeforeRetry: 15,
      maxFeePerGasForRetries: "55000000000",
      maxPriorityFeePerGasForRetries: "55000000000",
      maxRetriesPerTx: 3,
    },
  });
};
