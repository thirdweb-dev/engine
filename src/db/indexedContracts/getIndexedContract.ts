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
