import { prisma } from "../client";

interface DeleteIndexedContractParams {
  chainId: number;
  contractAddress: string;
}

export const deleteIndexedContract = async ({
  chainId,
  contractAddress,
}: DeleteIndexedContractParams) => {
  return prisma.indexedContracts.delete({
    where: {
      chainId_contractAddress: {
        chainId,
        contractAddress,
      },
    },
  });
};
