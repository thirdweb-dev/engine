import { Job, Processor, Worker } from "bullmq";
import superjson from "superjson";
import { defineChain, toSerializableTransaction } from "thirdweb";
import { getAccount } from "../../utils/account";
import { redis } from "../../utils/redis/redis";
import { thirdwebClient } from "../../utils/sdk";
import { enqueueConfirmTransaction } from "../queues/confirmTransactionQueue";
import { logWorkerEvents } from "../queues/queues";
import {
  SEND_TRANSACTION_QUEUE_NAME,
  SendTransactionData,
} from "../queues/sendTransactionQueue";

const handler: Processor<any, void, string> = async (job: Job<string>) => {
  const { preparedTransaction, isRetry } = superjson.parse<SendTransactionData>(
    job.data,
  );
  const { chainId, to, from, data } = preparedTransaction;

  // Validate required params.
  if (!chainId || !to || !from || !data) {
    job.log("Missing required args.");
    return;
  }

  const chain = defineChain(chainId);
  const populatedTransaction = await toSerializableTransaction({
    from,
    transaction: {
      client: thirdwebClient,
      chain,
      ...preparedTransaction,
    },
  });

  // Double gas for retries.
  if (isRetry) {
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

  const account = await getAccount({
    chainId,
    from,
  });
  const { transactionHash } = await account.sendTransaction(
    populatedTransaction,
  );

  job.log(
    `Transaction sent with hash ${transactionHash}. Confirming transaction...`,
  );
  await enqueueConfirmTransaction({
    sentTransaction: {
      ...preparedTransaction,
      sentAt: new Date(),
      transactionHash,
    },
  });
};

// Worker
const _worker = new Worker(SEND_TRANSACTION_QUEUE_NAME, handler, {
  concurrency: 10,
  connection: redis,
});
logWorkerEvents(_worker);
