import { prisma } from "../client";

interface UpsertChainIndexerParams {
  chainId: number;
  currentBlockNumber: number;
}

export const upsertChainIndexer = async ({
  chainId,
  currentBlockNumber,
}: UpsertChainIndexerParams) => {
  return prisma.chainIndexers.upsert({
    where: {
      chainId,
    },
    update: {
      chainId,
      lastIndexedBlock: currentBlockNumber,
    },
    create: {
      chainId,
      lastIndexedBlock: currentBlockNumber,
    },
  });
};
