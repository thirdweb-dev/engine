import { getTxById } from "../../db/transactions/getTxById";

interface AwaitTxParams {
  queueId: string;
  status: string;
  timeoutInSeconds: number;
}

export const awaitTx = async ({
  queueId,
  status,
  timeoutInSeconds,
}: AwaitTxParams) => {
  const startTime = Date.now();
  while (true) {
    if (Date.now() - startTime > timeoutInSeconds * 1000) {
      throw new Error(`Timeout waiting for tx ${queueId} to be ${status}`);
    }

    const data = await getTxById({ queueId });
    if (data.status === status) {
      return data;
    }
  }
};
