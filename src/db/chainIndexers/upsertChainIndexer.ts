import { PrismaTransaction } from "../../schema/prisma";
import { getPrismaWithPostgresTx } from "../client";

interface UpsertChainIndexerParams {
  chainId: number;
  currentBlockNumber: number;
  pgtx?: PrismaTransaction;
}

export const upsertChainIndexer = async ({
  chainId,
  currentBlockNumber,
  pgtx,
}: UpsertChainIndexerParams) => {
  const prisma = getPrismaWithPostgresTx(pgtx);
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
