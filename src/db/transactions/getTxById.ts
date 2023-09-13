import { prisma } from "../client";
import { cleanTxs } from "./cleanTxs";

interface GetTxByIdParams {
  queueId: string;
}

export const getTxById = async ({ queueId }: GetTxByIdParams) => {
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
