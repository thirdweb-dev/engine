import { Job, Processor, Worker } from "bullmq";
import superjson from "superjson";
import {
  defineChain,
  encode,
  prepareTransaction,
  simulateTransaction,
} from "thirdweb";
import { incrWalletNonce } from "../../db/wallets/walletNonce";
import { redis } from "../../utils/redis/redis";
import { thirdwebClient } from "../../utils/sdk";
import {
  PREPARE_TRANSACTION_QUEUE_NAME,
  PrepareTransactionData,
} from "../queues/prepareTransactionQueue";
import { logWorkerEvents } from "../queues/queues";
import { enqueueSendTransaction } from "../queues/sendTransactionQueue";

const handler: Processor<any, void, string> = async (job: Job<string>) => {
  const { queuedTransaction } = superjson.parse<PrepareTransactionData>(
    job.data,
  );
  const {
    chainId,
    from,
    to,
    data,
    value,
    gas,
    gasPrice,
    maxFeePerGas,
    maxPriorityFeePerGas,
  } = queuedTransaction;

  // Validate required params.
  if (!chainId || !from || !to || !data) {
    job.log("Missing required args.");
    return;
  }

  const chain = defineChain(chainId);

  // Prepare transaction.
  const transaction = prepareTransaction({
    client: thirdwebClient,
    chain,
    to,
    data,
    value,
    gas,
    gasPrice,
    maxFeePerGas,
    maxPriorityFeePerGas,
  });

  // Simulate transaction.
  try {
    await simulateTransaction({ transaction });
  } catch (e) {
    // @TODO: update DB state.
    return;
  }

  // @TODO: consider moving the nonce to the "sendTransaction" step.
  const nonce = await incrWalletNonce(chainId, from);
  const encodedData = await encode(transaction);

  job.log(`Transaction prepared with nonce ${nonce}. Sending transaction...`);
  await enqueueSendTransaction({
    preparedTransaction: {
      ...queuedTransaction,
      nonce,
      data: encodedData,
    },
    isRetry: false,
  });

  // @TODO: update DB state
};

// Worker
const _worker = new Worker(PREPARE_TRANSACTION_QUEUE_NAME, handler, {
  concurrency: 10,
  connection: redis,
});
logWorkerEvents(_worker);
