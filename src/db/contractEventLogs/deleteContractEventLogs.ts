import { prisma } from "../client";

interface DeleteContractEventLogsParams {
  chainId: number;
  contractAddress: string;
}

export const deleteContractEventLogs = async ({
  chainId,
  contractAddress,
}: DeleteContractEventLogsParams) => {
  return prisma.contractEventLogs.deleteMany({
    where: {
      chainId: chainId.toString(),
      contractAddress,
    },
  });
};
