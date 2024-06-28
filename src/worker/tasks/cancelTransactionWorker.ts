import { Job, Processor, Worker } from "bullmq";
import superjson from "superjson";
import { defineChain } from "thirdweb";
import { WebhooksEventTypes } from "../../schema/webhooks";
import {
  CancelledTransaction,
  sendCancellationTransaction,
} from "../../server/utils/transaction";
import { msSince } from "../../utils/date";
import { env } from "../../utils/env";
import { redis } from "../../utils/redis/redis";
import { reportUsage } from "../../utils/usage";
import {
  CANCEL_TRANSACTION_QUEUE_NAME,
  CancelTransactionData,
} from "../queues/cancelTransactionQueue";
import { logWorkerEvents } from "../queues/queues";
import { enqueueWebhook } from "../queues/sendWebhookQueue";

const handler: Processor<any, void, string> = async (job: Job<string>) => {
  const { sentTransaction } = superjson.parse<CancelTransactionData>(job.data);
  const { chainId, from, nonce } = sentTransaction;

  // Validate required params.
  if (!chainId || !from || !nonce) {
    job.log("Missing required args.");
    return;
  }

  const transactionHash = await sendCancellationTransaction({
    chainId,
    from,
    // Crucial: Set the same transaction's nonce.
    nonce,
  });

  // @TODO: update DB.
  job.log(`Cancel transaction sent: ${transactionHash}`);
  const cancelledTransaction: CancelledTransaction = {
    ...sentTransaction,
    transactionHash,
    cancelledAt: new Date(),
  };
  await enqueueWebhook({
    type: WebhooksEventTypes.CANCELLED_TX,
    queueId: cancelledTransaction.queueId,
  });
  _reportUsageSuccess(cancelledTransaction);
};

const _reportUsageSuccess = (cancelledTransaction: CancelledTransaction) => {
  const chain = defineChain(cancelledTransaction.chainId);
  reportUsage([
    {
      action: "cancel_tx",
      input: {
        ...cancelledTransaction,
        provider: chain.rpc,
        msSinceQueue: msSince(cancelledTransaction.queuedAt),
        msSinceSend:
          "sentAt" in cancelledTransaction
            ? msSince(cancelledTransaction.sentAt)
            : undefined,
      },
    },
  ]);
};

// Worker
const _worker = new Worker(CANCEL_TRANSACTION_QUEUE_NAME, handler, {
  concurrency: env.CANCEL_TRANSACTION_QUEUE_CONCURRENCY,
  connection: redis,
});
logWorkerEvents(_worker);
