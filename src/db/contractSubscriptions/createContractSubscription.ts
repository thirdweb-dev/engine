import { prisma } from "../client";

interface CreateContractSubscriptionParams {
  chainId: number;
  contractAddress: string;
  webhookId?: number;
}

export const createContractSubscription = async ({
  chainId,
  contractAddress,
  webhookId,
}: CreateContractSubscriptionParams) => {
  return prisma.contractSubscriptions.create({
    data: {
      chainId,
      contractAddress,
      webhookId,
    },
    include: {
      webhook: true,
    },
  });
};
