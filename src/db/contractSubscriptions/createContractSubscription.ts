import { prisma } from "../client";

interface CreateContractSubscriptionParams {
  chainId: number;
  contractAddress: string;
  webhookId?: number;
  processEventLogs: boolean;
  filterEvents: string[];
  processTransactionReceipts: boolean;
}

export const createContractSubscription = async ({
  chainId,
  contractAddress,
  webhookId,
  processEventLogs,
  filterEvents,
  processTransactionReceipts,
}: CreateContractSubscriptionParams) => {
  return prisma.contractSubscriptions.create({
    data: {
      chainId,
      contractAddress,
      webhookId,
      processEventLogs,
      filterEvents,
      processTransactionReceipts,
    },
    include: {
      webhook: true,
    },
  });
};
