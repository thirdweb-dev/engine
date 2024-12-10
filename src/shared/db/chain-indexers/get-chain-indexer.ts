import { Prisma } from "@prisma/client";
import type { PrismaTransaction } from "../../schemas/prisma";
import { getPrismaWithPostgresTx } from "../client";

interface GetLastIndexedBlockParams {
  chainId: number;
  pgtx?: PrismaTransaction;
}

export const getLastIndexedBlock = async ({
  chainId,
  pgtx,
}: GetLastIndexedBlockParams) => {
  const prisma = getPrismaWithPostgresTx(pgtx);

  const indexedChain = await prisma.chainIndexers.findUnique({
    where: {
      chainId: chainId.toString(),
    },
  });

  if (indexedChain) {
    return indexedChain.lastIndexedBlock;
  }
};

interface GetBlockForIndexingParams {
  chainId: number;
  pgtx?: PrismaTransaction;
}

export const getBlockForIndexing = async ({
  chainId,
  pgtx,
}: GetBlockForIndexingParams) => {
  const prisma = getPrismaWithPostgresTx(pgtx);

  const lastIndexedBlock = await prisma.$queryRaw<
    { lastIndexedBlock: number }[]
  >`
    SELECT
      "lastIndexedBlock"
    FROM
      "chain_indexers"
    WHERE
      "chainId"=${Prisma.sql`${chainId.toString()}`}
    FOR UPDATE NOWAIT
  `;
  return lastIndexedBlock[0].lastIndexedBlock;
};
