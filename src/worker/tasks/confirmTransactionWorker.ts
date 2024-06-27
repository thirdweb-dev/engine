import { Job, Processor, Worker } from "bullmq";
import superjson from "superjson";
import { defineChain, eth_getTransactionReceipt, getRpcClient } from "thirdweb";
import { getBlockNumberish } from "../../utils/block";
import { getConfig } from "../../utils/cache/getConfig";
import { msSince } from "../../utils/date";
import { env } from "../../utils/env";
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

  const config = await getConfig();
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
    // Handle an unconfirmed transaction below.
  }

  if (msSince(sentTransaction.sentAt) > DEADLINE_IN_MS) {
    job.log(
      "Transaction is not confirmed after cancel deadline. Cancelling transaction...",
    );
    await enqueueCancelTransaction({
      sentTransaction,
    });
    return;
  }

  const blockNumber = await getBlockNumberish(chainId);
  if (
    blockNumber - sentTransaction.sentAtBlock >
    config.minEllapsedBlocksBeforeRetry
  ) {
    job.log(
      "Transaction is not confirmed before cancel deadline. Retrying transaction...",
    );
    await enqueueSendTransaction({
      preparedTransaction: sentTransaction,
      isRetry: true,
    });
    return;
  }

  job.log(
    "Transaction is not confirmed before retry deadline. Check again later...",
  );
  throw new Error("NOT_CONFIRMED_YET");
};

// Worker
const _worker = new Worker(CONFIRM_TRANSACTION_QUEUE_NAME, handler, {
  concurrency: env.CONFIRM_TRANSACTION_QUEUE_CONCURRENCY,
  connection: redis,
});
logWorkerEvents(_worker);
