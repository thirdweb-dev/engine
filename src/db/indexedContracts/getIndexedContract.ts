import { prisma } from "../client";

export const getIndexedContracts = async (chainId: number) => {
  return await prisma.indexedContracts.findMany({
    where: {
      chainId,
    },
  });
};

export const getAllIndexedContracts = async () => {
  return await prisma.indexedContracts.findMany();
};

export const getIndexedContractsUniqueChainIds = async () => {
  const uniqueChainIds = await prisma.indexedContracts.findMany({
    distinct: ["chainId"],
    select: {
      chainId: true,
    },
  });

  return uniqueChainIds.map((contract) => contract.chainId);
};
