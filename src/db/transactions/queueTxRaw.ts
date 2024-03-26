import type { Prisma } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";
import { PrismaTransaction } from "../../schema/prisma";
import { simulateTx } from "../../server/utils/simulateTx";
import {
  getIdempotencyCacheKey,
  getQueueIdCacheKey,
} from "../../utils/redisKeys";
import { UsageEventTxActionEnum, reportUsage } from "../../utils/usage";
import { ingestRequestQueue } from "../client";
import { getWalletDetails } from "../wallets/getWalletDetails";

type QueueTxRawParams = Omit<
  Prisma.TransactionsCreateInput,
  "fromAddress" | "signerAddress"
> &
  (
    | {
        fromAddress: string;
        signerAddress?: never;
      }
    | {
        fromAddress?: never;
        signerAddress: string;
      }
  ) & {
    pgtx?: PrismaTransaction;
    simulateTx?: boolean;
    idempotencyKey?: string;
  };

export const queueTxRaw = async ({
  pgtx,
  simulateTx: shouldSimulate,
  idempotencyKey,
  ...tx
}: QueueTxRawParams) => {
  const queueId = uuidv4();

  const walletDetails = await getWalletDetails({
    pgtx,
    address: (tx.fromAddress || tx.signerAddress) as string,
  });

  if (!walletDetails) {
    throw new Error(
      `No backend wallet found with address ${
        tx.fromAddress || tx.signerAddress
      }`,
    );
  }

  if (shouldSimulate) {
    await simulateTx({ txRaw: tx });
  }

  reportUsage([
    {
      input: {
        chainId: tx.chainId || undefined,
        fromAddress: tx.fromAddress || undefined,
        toAddress: tx.toAddress || undefined,
        value: tx.value || undefined,
        transactionHash: tx.transactionHash || undefined,
        functionName: tx.functionName || undefined,
        extension: tx.extension || undefined,
      },
      action: UsageEventTxActionEnum.QueueTx,
    },
  ]);

  const ingestQueueData = { ...tx, id: queueId, idempotencyKey };
  ingestRequestQueue.add(queueId, ingestQueueData, {
    jobId: queueId,
    removeOnComplete: true,
  });

  // TODO: To bring ths back in the next iteration
  const redisClient = await ingestRequestQueue.client;
  const idempotencyCacheKey = getIdempotencyCacheKey(idempotencyKey || queueId);
  const queueIdCacheKey = getQueueIdCacheKey(queueId);
  console.log("::Debug Log:: queueIdCacheKey:", queueIdCacheKey);
  console.log("::Debug Log:: idempotencyCacheKey:", idempotencyCacheKey);

  await redisClient.hmset(queueIdCacheKey, ingestQueueData);
  await redisClient.hmset(idempotencyCacheKey, ingestQueueData);
  return { id: queueId };
};
