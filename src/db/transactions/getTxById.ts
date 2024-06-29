import { Static } from "@sinclair/typebox";
import { transactionResponseSchema } from "../../server/schemas/transaction";
import { cleanTxs } from "./cleanTxs";
import { redis } from "../../utils/redis/redis";

interface GetTxByIdParams {
  queueId: string;
}

export const getTxById = async ({
  queueId,
}: GetTxByIdParams): Promise<Static<
  typeof transactionResponseSchema
> | null> => {
  const { status, txData } = await redis.hgetall(queueId);
  console.log({ status, txData });

  if (!status || !txData) {
    return null;
  }

  const tx = JSON.parse(txData);
  tx.status = status as any;

  const [cleanedTx] = cleanTxs([JSON.parse(tx)]);
  return cleanedTx;
};
