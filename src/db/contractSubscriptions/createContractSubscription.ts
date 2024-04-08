import { prisma } from "../client";

interface CreateContractSubscriptionParams {
  chainId: number;
  contractAddress: string;
}

export const createContractSubscription = async ({
  chainId,
  contractAddress,
}: CreateContractSubscriptionParams) => {
  return prisma.contractSubscriptions.create({
    data: { chainId, contractAddress },
  });
};
