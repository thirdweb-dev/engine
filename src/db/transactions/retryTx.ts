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

  await prisma.transaction.update({
    where: {
      id: queueId,
      transactionDetails: {
        NOT: undefined,
      },
    },
    // TODO: Do these need to all be separate fields?
    data: {
      transactionDetails: {
        retryGasValues: true,
        retryMaxFeePerGas: maxFeePerGas,
        retryMaxPriorityFeePerGas: maxPriorityFeePerGas,
      },
    },
  });
};
