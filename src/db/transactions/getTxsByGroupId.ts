import { Transactions } from "@prisma/client";
import { PrismaTransaction } from "../../schema/prisma";
import { getPrismaWithPostgresTx } from "../client";

interface GetTxsByGroupIdParams {
  pgtx?: PrismaTransaction;
  groupId: string;
}

export const getTxsByGroupId = async ({
  pgtx,
  groupId,
}: GetTxsByGroupIdParams): Promise<Transactions[]> => {
  const prisma = getPrismaWithPostgresTx(pgtx);
  const txs = await prisma.transactions.findMany({
    where: {
      groupId,
    },
  });
  return txs;
};
