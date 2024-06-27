import { Job, Processor, Worker } from "bullmq";
import superjson from "superjson";
import { cancelTransaction } from "../../server/utils/transaction";
import { env } from "../../utils/env";
import { redis } from "../../utils/redis/redis";
import {
  CANCEL_TRANSACTION_QUEUE_NAME,
  CancelTransactionData,
} from "../queues/cancelTransactionQueue";
import { logWorkerEvents } from "../queues/queues";

const handler: Processor<any, void, string> = async (job: Job<string>) => {
  const { sentTransaction } = superjson.parse<CancelTransactionData>(job.data);
  const { chainId, from, nonce } = sentTransaction;

  // Validate required params.
  if (!chainId || !from || !nonce) {
    job.log("Missing required args.");
    return;
  }

  const transactionHash = await cancelTransaction({
    chainId,
    from,
    // Crucial: Set the same transaction's nonce.
    nonce,
  });

  // @TODO: update DB.
  job.log(`Cancel transaction sent: ${transactionHash}`);
};

// Worker
const _worker = new Worker(CANCEL_TRANSACTION_QUEUE_NAME, handler, {
  concurrency: env.CANCEL_TRANSACTION_QUEUE_CONCURRENCY,
  connection: redis,
});
logWorkerEvents(_worker);
