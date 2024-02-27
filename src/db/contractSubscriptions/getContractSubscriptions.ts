import { prisma } from "../client";

export interface GetContractSubscriptionsParams {
  chainId: number;
  contractAddress: string;
}

export const isContractSubscribed = async ({
  chainId,
  contractAddress,
}: GetContractSubscriptionsParams) => {
  const subscribedContract = await prisma.contractSubscriptions.findUnique({
    where: {
      chainId_contractAddress: {
        chainId,
        contractAddress,
      },
    },
  });

  if (!subscribedContract) return false;
  else return true;
};

export const getContractSubscriptionsByChainId = async (chainId: number) => {
  return await prisma.contractSubscriptions.findMany({
    where: {
      chainId,
    },
  });
};

export const getAllContractSubscriptions = async () => {
  return await prisma.contractSubscriptions.findMany();
};

export const getContractSubscriptionsUniqueChainIds = async () => {
  const uniqueChainIds = await prisma.contractSubscriptions.findMany({
    distinct: ["chainId"],
    select: {
      chainId: true,
    },
  });

  return uniqueChainIds.map((contract) => contract.chainId);
};
