import type { Transactions } from "@prisma/client";
import { randomUUID } from "crypto";
import { PrismaTransaction } from "../../schema/prisma";
import { simulateTx } from "../../server/utils/simulateTx";
import { UsageEventTxActionEnum, reportUsage } from "../../utils/usage";
import { IngestQueueData, ingestQueue } from "../../worker/queues/queues";
import { getWalletDetails } from "../wallets/getWalletDetails";

type QueueTxRawParams = {
  tx: Transactions;
  pgtx?: PrismaTransaction;
  simulateTx?: boolean;
  idempotencyKey?: string;
};

export const queueTxRaw = async ({
  tx,
  pgtx,
  simulateTx: shouldSimulate,
  idempotencyKey,
}: QueueTxRawParams) => {
  const queueId = randomUUID();

  if (!tx.fromAddress || !tx.signerAddress) {
    throw "tx is missing fromAddress or signerAddress.";
  }

  const walletDetails = await getWalletDetails({
    address: tx.fromAddress || tx.signerAddress,
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

  const job: IngestQueueData = {
    tx: {
      ...tx,
      id: queueId,
      idempotencyKey: idempotencyKey ?? queueId,
    },
  };
  await ingestQueue.add(queueId, job, {
    jobId: job.tx.idempotencyKey,
  });

  return { id: queueId };
};
