import { prisma } from "../client";

interface RetryTxParams {
  queueId: string;
  maxFeePerGas: string;
  maxPriorityFeePerGas: string;
}

// TODO: Switch all functions to object params
export const retryTx = async ({
  queueId,
  maxFeePerGas,
  maxPriorityFeePerGas,
}: RetryTxParams) => {
  await prisma.transactions.update({
    where: {
      id: queueId,
    },
    // TODO: Do these need to all be separate fields?
    data: {
      retryMaxFeePerGas: maxFeePerGas,
      retryMaxPriorityFeePerGas: maxPriorityFeePerGas,
    },
  });
};
