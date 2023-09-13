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
  console.log("Retrying tx...");
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
