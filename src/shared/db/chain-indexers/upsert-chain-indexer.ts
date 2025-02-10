import type { PrismaTransaction } from "../../schemas/prisma.js";
import { getPrismaWithPostgresTx } from "../client.js";

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
      chainId: chainId.toString(),
    },
    update: {
      chainId: chainId.toString(),
      lastIndexedBlock: currentBlockNumber,
    },
    create: {
      chainId: chainId.toString(),
      lastIndexedBlock: currentBlockNumber,
    },
  });
};
