import { Job, Processor, Worker } from "bullmq";
import superjson from "superjson";
import { defineChain, toSerializableTransaction } from "thirdweb";
import { WebhooksEventTypes } from "../../schema/webhooks";
import {
  PreparedTransaction,
  SentTransaction,
} from "../../server/utils/transaction";
import { getAccount } from "../../utils/account";
import { getBlockNumberish } from "../../utils/block";
import { msSince } from "../../utils/date";
import { env } from "../../utils/env";
import { redis } from "../../utils/redis/redis";
import { thirdwebClient } from "../../utils/sdk";
import { reportUsage } from "../../utils/usage";
import { enqueueConfirmTransaction } from "../queues/confirmTransactionQueue";
import { logWorkerEvents } from "../queues/queues";
import {
  SEND_TRANSACTION_QUEUE_NAME,
  SendTransactionData,
} from "../queues/sendTransactionQueue";
import { enqueueWebhook } from "../queues/sendWebhookQueue";

const handler: Processor<any, void, string> = async (job: Job<string>) => {
  const { preparedTransaction } = superjson.parse<SendTransactionData>(
    job.data,
  );
  const { chainId, to, from, data } = preparedTransaction;

  // Validate required params.
  if (!chainId || !to || !from || !data) {
    job.log("Missing required args.");
    return;
  }

  const populatedTransaction = await _populateTransaction(preparedTransaction);
  job.log(
    `Populated transaction: ${superjson.stringify(populatedTransaction)}`,
  );

  const account = await getAccount({ chainId, from });
  const { transactionHash } = await account.sendTransaction(
    populatedTransaction,
  );

  job.log(
    `Transaction sent with hash ${transactionHash}. Confirming transaction...`,
  );
  const sentTransaction: SentTransaction = {
    ...preparedTransaction,
    sentAt: new Date(),
    sentAtBlock: await getBlockNumberish(chainId),
    transactionHash,
  };
  await enqueueConfirmTransaction({ sentTransaction });

  await enqueueWebhook({
    type: WebhooksEventTypes.SENT_TX,
    queueId: sentTransaction.queueId,
  });
  _reportUsageSuccess(sentTransaction);
};

export const _populateTransaction = async (
  preparedTransaction: PreparedTransaction,
) => {
  const chain = defineChain(preparedTransaction.chainId);
  const populatedTransaction = await toSerializableTransaction({
    from: preparedTransaction.from,
    transaction: {
      client: thirdwebClient,
      chain,
      ...preparedTransaction,
    },
  });

  // Double gas for retries.
  if (preparedTransaction.retryCount > 0) {
    if (populatedTransaction.gasPrice) {
      populatedTransaction.gasPrice *= 2n;
    }
    if (populatedTransaction.maxFeePerGas) {
      populatedTransaction.maxFeePerGas *= 2n;
    }
    if (populatedTransaction.maxFeePerGas) {
      populatedTransaction.maxFeePerGas *= 2n;
    }
  }

  return populatedTransaction;
};

const _reportUsageSuccess = (sentTransaction: SentTransaction) => {
  const chain = defineChain(sentTransaction.chainId);
  reportUsage([
    {
      action: "send_tx",
      input: {
        ...sentTransaction,
        provider: chain.rpc,
        msSinceQueue: msSince(sentTransaction.queuedAt),
      },
    },
  ]);
};

// Worker
const _worker = new Worker(SEND_TRANSACTION_QUEUE_NAME, handler, {
  concurrency: env.SEND_TRANSACTION_QUEUE_CONCURRENCY,
  connection: redis,
});
logWorkerEvents(_worker);
