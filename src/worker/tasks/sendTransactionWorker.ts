import { Job, Processor, Worker } from "bullmq";
import superjson from "superjson";
import { defineChain, toSerializableTransaction } from "thirdweb";
import { TransactionDB } from "../../db/transactions/db";
import { incrWalletNonce } from "../../db/wallets/walletNonce";
import { getAccount } from "../../utils/account";
import { getBlockNumberish } from "../../utils/block";
import { msSince } from "../../utils/date";
import { env } from "../../utils/env";
import { redis } from "../../utils/redis/redis";
import { thirdwebClient } from "../../utils/sdk";
import { simulateQueuedTransaction } from "../../utils/transaction/simulateTransaction";
import {
  ErroredTransaction,
  QueuedTransaction,
  SentTransaction,
} from "../../utils/transaction/types";
import { enqueueTransactionWebhook } from "../../utils/transaction/webhook";
import { reportUsage } from "../../utils/usage";
import { enqueueMineTransaction } from "../queues/mineTransactionQueue";
import { logWorkerEvents } from "../queues/queues";
import {
  SEND_TRANSACTION_QUEUE_NAME,
  SendTransactionData,
} from "../queues/sendTransactionQueue";

const handler: Processor<any, void, string> = async (job: Job<string>) => {
  const { queueId } = superjson.parse<SendTransactionData>(job.data);

  // Assert valid transaction state.
  const queuedTransaction = await TransactionDB.get(queueId);
  if (queuedTransaction?.status !== "queued") {
    job.log(
      `Invalid transaction state: ${superjson.stringify(queuedTransaction)}`,
    );
    return;
  }

  // Simulate transaction and drop transactions that are expected to fail onchain.
  const simulationError = await simulateQueuedTransaction(queuedTransaction);
  if (simulationError) {
    const erroredTransaction: ErroredTransaction = {
      ...queuedTransaction,
      status: "errored",
      errorMessage: simulationError,
    };
    await TransactionDB.set(erroredTransaction);
    await enqueueMineTransaction({ queueId: erroredTransaction.queueId });
    await enqueueTransactionWebhook(erroredTransaction);
    _reportUsageError(erroredTransaction);
    return;
  }

  // Prepare nonce + gas settings.
  const populatedTransaction = await populateTransaction(queuedTransaction);
  job.log(
    `Populated transaction: ${superjson.stringify(populatedTransaction)}`,
  );

  // Send the populated transaction and handle side effects.
  const sentTransaction = await sendPopulatedTransaction({
    preparedTransaction: queuedTransaction,
    populatedTransaction,
  });
  job.log(`Transaction sent with hash ${sentTransaction.transactionHash}.`);
};

export const populateTransaction = async (transaction: QueuedTransaction) => {
  const {
    chainId,
    from,
    to,
    value,
    data,
    gas,
    gasPrice,
    maxFeePerGas,
    maxPriorityFeePerGas,
  } = transaction;

  // Re-use existing nonce or get the next available one.
  const nonce = transaction.nonce ?? (await incrWalletNonce(chainId, from));

  const populatedTransaction = await toSerializableTransaction({
    from,
    transaction: {
      client: thirdwebClient,
      chain: defineChain(chainId),
      to,
      value,
      data,
      nonce,
      gas,
      gasPrice,
      maxFeePerGas,
      maxPriorityFeePerGas,
    },
  });

  // Double gas for retries.
  if (transaction.retryCount > 0) {
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

export const sendPopulatedTransaction = async (args: {
  preparedTransaction: QueuedTransaction;
  populatedTransaction: Awaited<ReturnType<typeof populateTransaction>>;
}) => {
  const { preparedTransaction, populatedTransaction } = args;

  if (!populatedTransaction.nonce) {
    throw new Error("Nonce not set.");
  }

  const account = await getAccount({
    chainId: preparedTransaction.chainId,
    from: preparedTransaction.from,
  });
  const { transactionHash } = await account.sendTransaction(
    populatedTransaction,
  );

  const sentTransaction: SentTransaction = {
    ...preparedTransaction,
    nonce: populatedTransaction.nonce,
    status: "sent",
    sentAt: new Date(),
    sentAtBlock: await getBlockNumberish(preparedTransaction.chainId),
    transactionHash,
  };
  await TransactionDB.set(sentTransaction);
  await enqueueMineTransaction({ queueId: sentTransaction.queueId });
  await enqueueTransactionWebhook(sentTransaction);
  _reportUsageSuccess(sentTransaction);

  return sentTransaction;
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

const _reportUsageError = (erroredTransaction: ErroredTransaction) => {
  reportUsage([
    {
      action: "error_tx",
      input: {
        ...erroredTransaction,
        msSinceQueue: msSince(erroredTransaction.queuedAt),
      },
      error: erroredTransaction.errorMessage,
    },
  ]);
};

// Worker
const _worker = new Worker(SEND_TRANSACTION_QUEUE_NAME, handler, {
  concurrency: env.SEND_TRANSACTION_QUEUE_CONCURRENCY,
  connection: redis,
});
logWorkerEvents(_worker);
