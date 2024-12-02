import { prisma } from "../client";

interface DeleteContractTransactionReceiptsParams {
  chainId: number;
  contractAddress: string;
}

export const deleteContractTransactionReceipts = async ({
  chainId,
  contractAddress,
}: DeleteContractTransactionReceiptsParams) => {
  return prisma.contractTransactionReceipts.deleteMany({
    where: {
      chainId: chainId.toString(),
      contractAddress,
    },
  });
};
