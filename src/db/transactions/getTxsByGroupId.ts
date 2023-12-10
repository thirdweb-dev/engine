import { PrismaTransaction } from "../../schema/prisma";
import { getPrismaWithPostgresTx } from "../client";
import { cleanTxs } from "./cleanTxs";

interface GetTxsByGroupIdParams {
  pgtx?: PrismaTransaction;
  groupId: string;
}

export const getTxsByGroupId = async ({
  pgtx,
  groupId,
}: GetTxsByGroupIdParams) => {
  const prisma = getPrismaWithPostgresTx(pgtx);
  const txs = await prisma.transactions.findMany({
    where: {
      groupId,
    },
  });

  if (!txs) {
    return [];
  }

  return cleanTxs(txs);
};
