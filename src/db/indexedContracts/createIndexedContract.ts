import { prisma } from "../client";

interface UpsertIndexedContractParams {
  chainId: number;
  contractAddress: string;
}

export const upsertIndexedContract = async ({
  chainId,
  contractAddress,
}: UpsertIndexedContractParams) => {
  return prisma.indexedContracts.upsert({
    where: {
      chainId_contractAddress: {
        chainId,
        contractAddress,
      },
    },
    update: {
      chainId,
      contractAddress,
    },
    create: { chainId, contractAddress },
  });
};
