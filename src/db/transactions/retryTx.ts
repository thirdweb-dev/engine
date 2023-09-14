import { PrismaTransaction } from "../../schema/prisma";
import { getPrismaWithPostgresTx } from "../client";

interface RetryTxParams {
  pgtx?: PrismaTransaction;
  queueId: string;
  maxFeePerGas: string;
  maxPriorityFeePerGas: string;
}

export const retryTx = async ({
  pgtx,
  queueId,
  maxFeePerGas,
  maxPriorityFeePerGas,
}: RetryTxParams) => {
  const prisma = getPrismaWithPostgresTx(pgtx);

  await prisma.transactions.update({
    where: {
      id: queueId,
    },
    // TODO: Do these need to all be separate fields?
    data: {
      retryGasValues: true,
      retryMaxFeePerGas: maxFeePerGas,
      retryMaxPriorityFeePerGas: maxPriorityFeePerGas,
    },
  });
};
