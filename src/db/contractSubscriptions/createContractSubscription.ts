import { prisma } from "../client";

interface CreateContractSubscriptionParams {
  chainId: number;
  contractAddress: string;
  webhookId?: number;
  parseEventLogs: boolean;
  filterEventLogs: string[];
  parseTransactionReceipts: boolean;
}

export const createContractSubscription = async ({
  chainId,
  contractAddress,
  webhookId,
  parseEventLogs,
  filterEventLogs,
  parseTransactionReceipts,
}: CreateContractSubscriptionParams) => {
  return prisma.contractSubscriptions.create({
    data: {
      chainId,
      contractAddress,
      webhookId,
      parseEventLogs,
      filterEventLogs,
      parseTransactionReceipts,
    },
    include: {
      webhook: true,
    },
  });
};
