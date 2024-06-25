import { Job, Processor, Worker } from "bullmq";
import superjson from "superjson";
import { defineChain, eth_getTransactionReceipt, getRpcClient } from "thirdweb";
import { msSince } from "../../utils/date";
import { redis } from "../../utils/redis/redis";
import { thirdwebClient } from "../../utils/sdk";
import { enqueueCancelTransaction } from "../queues/cancelTransactionQueue";
import {
  CONFIRM_TRANSACTION_QUEUE_NAME,
  ConfirmTransactionData,
} from "../queues/confirmTransactionQueue";
import { logWorkerEvents } from "../queues/queues";
import { enqueueSendTransaction } from "../queues/sendTransactionQueue";

// @TODO: move to DB config.
const DEADLINE_IN_MS = 60 * 60 * 1000; // 1 hour

const handler: Processor<any, void, string> = async (job: Job<string>) => {
  const { sentTransaction } = superjson.parse<ConfirmTransactionData>(job.data);
  const { chainId, transactionHash } = sentTransaction;

  // Validate required params.
  if (!chainId || !transactionHash) {
    job.log("Missing required args.");
    return;
  }

  const chain = defineChain(chainId);
  const rpcRequest = getRpcClient({
    client: thirdwebClient,
    chain,
  });

  try {
    const receipt = await eth_getTransactionReceipt(rpcRequest, {
      hash: transactionHash,
    });
    // @TODO: update DB.
    job.log("Receipt found. This transaction is confirmed.");
    return;
  } catch (e) {
    if (msSince(sentTransaction.sentAt) > DEADLINE_IN_MS) {
      job.log(
        "Transaction is not confirmed after deadline. Cancelling transaction...",
      );
      await enqueueCancelTransaction({
        sentTransaction,
      });
    } else {
      job.log(
        "Transaction is not confirmed before deadline. Retrying transaction...",
      );
      await enqueueSendTransaction({
        preparedTransaction: sentTransaction,
        isRetry: true,
      });
    }
  }
};

// Worker
const _worker = new Worker(CONFIRM_TRANSACTION_QUEUE_NAME, handler, {
  concurrency: 10,
  connection: redis,
});
logWorkerEvents(_worker);
