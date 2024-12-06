import { prisma } from "../client";

interface CreateContractSubscriptionParams {
  chainId: number;
  contractAddress: string;
  webhookId?: number;
  processEventLogs: boolean;
  filterEvents: string[];
  processTransactionReceipts: boolean;
  filterFunctions: string[];
}

export const createContractSubscription = async ({
  chainId,
  contractAddress,
  webhookId,
  processEventLogs,
  filterEvents,
  processTransactionReceipts,
  filterFunctions,
}: CreateContractSubscriptionParams) => {
  return prisma.contractSubscriptions.create({
    data: {
      chainId: chainId.toString(),
      contractAddress,
      webhookId,
      processEventLogs,
      filterEvents,
      processTransactionReceipts,
      filterFunctions,
    },
    include: {
      webhook: true,
    },
  });
};
