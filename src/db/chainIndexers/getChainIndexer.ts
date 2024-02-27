import { PrismaTransaction } from "../../schema/prisma";
import { getPrismaWithPostgresTx } from "../client";

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
      "chainId"=${chainId}
    FOR UPDATE NOWAIT
  `;
  return lastIndexedBlock[0]["lastIndexedBlock"];
};
