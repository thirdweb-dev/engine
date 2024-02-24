import { prisma } from "../client";

interface DeleteContractLogs {
  chainId: number;
  contractAddress: string;
}

export const deleteContractLogs = async ({
  chainId,
  contractAddress,
}: DeleteContractLogs) => {
  return prisma.contractLogs.deleteMany({
    where: {
      chainId,
      contractAddress,
    },
  });
};
