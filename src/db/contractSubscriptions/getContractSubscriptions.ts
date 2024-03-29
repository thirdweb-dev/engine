import { prisma } from "../client";

export interface GetContractSubscriptionsParams {
  chainId: number;
  contractAddress: string;
}

export const isContractSubscribed = async ({
  chainId,
  contractAddress,
}: GetContractSubscriptionsParams) => {
  const subscribedContract = await prisma.contractSubscriptions.findMany({
    where: {
      chainId,
      contractAddress,
      deletedAt: null,
    },
  });

  if (subscribedContract.length === 0) return false;
  else return true;
};

export const getContractSubscriptionsByChainId = async (chainId: number) => {
  return await prisma.contractSubscriptions.findMany({
    where: {
      chainId,
      deletedAt: null,
    },
  });
};

export const getAllContractSubscriptions = async () => {
  return await prisma.contractSubscriptions.findMany({
    where: {
      deletedAt: null,
    },
  });
};

export const getContractSubscriptionsUniqueChainIds = async () => {
  const uniqueChainIds = await prisma.contractSubscriptions.findMany({
    distinct: ["chainId"],
    select: {
      chainId: true,
    },
    where: {
      deletedAt: null,
    },
  });

  return uniqueChainIds.map((contract) => contract.chainId);
};
