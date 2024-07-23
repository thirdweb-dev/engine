import { Job, Processor, Worker } from "bullmq";
import superjson from "superjson";
import { stringify } from "thirdweb/utils";
import { TransactionDB } from "../../db/transactions/db";
import { getChain } from "../../utils/chain";
import { msSince } from "../../utils/date";
import { env } from "../../utils/env";
import { redis } from "../../utils/redis/redis";
import { sendCancellationTransaction } from "../../utils/transaction/cancelTransaction";
import { CancelledTransaction } from "../../utils/transaction/types";
import { enqueueTransactionWebhook } from "../../utils/transaction/webhook";
import { reportUsage } from "../../utils/usage";
import {
  CancelTransactionData,
  CancelTransactionQueue,
} from "../queues/cancelTransactionQueue";
import { logWorkerExceptions } from "../queues/queues";

/**
 * The CANCEL_TRANSACTION worker is responsible for:
 * - Sending a null transaction to consume a transaction's nonce
 */
const handler: Processor<any, void, string> = async (job: Job<string>) => {
  const { queueId } = superjson.parse<CancelTransactionData>(job.data);

  // Assert valid transaction state.
  const sentTransaction = await TransactionDB.get(queueId);
  if (
    !sentTransaction ||
    sentTransaction.status !== "sent" ||
    sentTransaction.isUserOp
  ) {
    job.log(`Invalid transaction state: ${stringify(sentTransaction)}`);
    return;
  }
  const { chainId, from, nonce } = sentTransaction;

  const transactionHash = await sendCancellationTransaction({
    chainId,
    from,
    // Crucial: Set the same transaction's nonce.
    nonce,
  });

  job.log(`Cancel transaction sent: ${transactionHash}`);

  const cancelledTransaction: CancelledTransaction = {
    ...sentTransaction,
    status: "cancelled",
    cancelledAt: new Date(),
  };
  await TransactionDB.set(cancelledTransaction);
  await enqueueTransactionWebhook(cancelledTransaction);
  await _reportUsageSuccess(cancelledTransaction);
};

const _reportUsageSuccess = async (
  cancelledTransaction: CancelledTransaction,
) => {
  const chain = await getChain(cancelledTransaction.chainId);
  reportUsage([
    {
      action: "cancel_tx",
      input: {
        ...cancelledTransaction,
        provider: chain.rpc,
        msSinceQueue: msSince(cancelledTransaction.queuedAt),
        msSinceSend: msSince(cancelledTransaction.sentAt),
      },
    },
  ]);
};

// Worker
const _worker = new Worker(CancelTransactionQueue.name, handler, {
  concurrency: env.CANCEL_TRANSACTION_QUEUE_CONCURRENCY,
  connection: redis,
});
logWorkerExceptions(_worker);
