import { Job, Processor, Worker } from "bullmq";
import superjson from "superjson";
import { defineChain, prepareTransaction, simulateTransaction } from "thirdweb";
import { TransactionDB } from "../../db/transactions/db";
import { incrWalletNonce } from "../../db/wallets/walletNonce";
import { env } from "../../utils/env";
import { redis } from "../../utils/redis/redis";
import { thirdwebClient } from "../../utils/sdk";
import {
  ErroredTransaction,
  PreparedTransaction,
} from "../../utils/transaction/types";
import { enqueueTransactionWebhook } from "../../utils/transaction/webhook";
import { reportUsage } from "../../utils/usage";
import {
  PREPARE_TRANSACTION_QUEUE_NAME,
  PrepareTransactionData,
} from "../queues/prepareTransactionQueue";
import { logWorkerEvents } from "../queues/queues";
import { enqueueSendTransaction } from "../queues/sendTransactionQueue";
import { getWithdrawValue } from "../utils/withdraw";

const handler: Processor<any, void, string> = async (job: Job<string>) => {
  const { queuedTransaction } = superjson.parse<PrepareTransactionData>(
    job.data,
  );
  const {
    chainId,
    from,
    to,
    data,
    gas,
    gasPrice,
    maxFeePerGas,
    maxPriorityFeePerGas,
    extension,
  } = queuedTransaction;

  // Validate required params.
  if (!chainId || !from || !to || !data) {
    job.log("Missing required args.");
    return;
  }

  const chain = defineChain(chainId);

  // Set value.
  let value = queuedTransaction.value;
  if (extension === "withdraw") {
    value = await getWithdrawValue({ chainId, from, to });
  }

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

  // Simulate transaction and drop transactions that are expected to fail onchain.
  try {
    await simulateTransaction({ transaction });
  } catch (e) {
    const erroredTransaction: ErroredTransaction = {
      ...queuedTransaction,
      status: "errored",
      errorMessage: (e as any).toString(),
    };
    job.log(`Transaction errored: ${superjson.stringify(erroredTransaction)}`);

    await TransactionDB.set(erroredTransaction);
    await enqueueTransactionWebhook(erroredTransaction);
    _reportUsageError(erroredTransaction);
    return;
  }

  // @TODO: consider moving the nonce to the "sendTransaction" step.
  const nonce = await incrWalletNonce(chainId, from);

  job.log(`Transaction prepared with nonce ${nonce}. Sending transaction...`);
  const preparedTransaction: PreparedTransaction = {
    ...queuedTransaction,
    status: "prepared",
    nonce,
    data, // @TODO: this may be undefined
    value,
    retryCount: 0,
  };
  await enqueueSendTransaction({ preparedTransaction });
  await TransactionDB.set(preparedTransaction);
};

const _reportUsageError = (erroredTransaction: ErroredTransaction) => {
  reportUsage([
    {
      action: "not_send_tx",
      input: erroredTransaction,
      error: erroredTransaction.errorMessage,
    },
  ]);
};

// Worker
const _worker = new Worker(PREPARE_TRANSACTION_QUEUE_NAME, handler, {
  concurrency: env.PREPARE_TRANSACTION_QUEUE_CONCURRENCY,
  connection: redis,
});
logWorkerEvents(_worker);
