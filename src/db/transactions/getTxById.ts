import { PrismaTransaction } from "../../schema/prisma";
import { getPrismaWithPostgresTx } from "../client";
import { cleanTxs } from "./cleanTxs";

interface GetTxByIdParams {
  pgtx?: PrismaTransaction;
  queueId: string;
}

export const getTxById = async ({ pgtx, queueId }: GetTxByIdParams) => {
  const prisma = getPrismaWithPostgresTx(pgtx);

  const tx = await prisma.transactions.findUnique({
    where: {
      id: queueId,
    },
  });

  if (!tx) {
    // TODO: Defined error types
    throw new Error(`Transaction with ID ${queueId} not found!`);
  }

  const [cleanedTx] = cleanTxs([tx]);
  return cleanedTx;
};
