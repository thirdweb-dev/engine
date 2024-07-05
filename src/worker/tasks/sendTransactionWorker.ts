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
  const { queueId, retryCount } = superjson.parse<SendTransactionData>(
    job.data,
  );
  let sentTransaction: SentTransaction | null = null;
  const transaction = await TransactionDB.get(queueId);
  switch (transaction?.status) {
    case "queued":
      // Send a transaction for the first time.
      sentTransaction = await _handleQueuedTransaction(job, transaction);
      break;
    case "sent":
      // Retry a stuck transaction.
      sentTransaction = await _handleSentTransaction(
        job,
        transaction,
        retryCount,
      );
      break;
    default:
      job.log(`Invalid transaction state: ${JSON.stringify(transaction)}`);
      return;
  }

  if (sentTransaction) {
    await TransactionDB.set(sentTransaction);
    await enqueueMineTransaction({ queueId: sentTransaction.queueId });
    await enqueueTransactionWebhook(sentTransaction);
    _reportUsageSuccess(sentTransaction);

    const transactionHash = sentTransaction.sentTransactionHashes.at(-1);
    job.log(`Transaction sent: ${transactionHash}.`);
  }
};

const _handleQueuedTransaction = async (
  job: Job,
  queuedTransaction: QueuedTransaction,
): Promise<SentTransaction | null> => {
  const { chainId, from } = queuedTransaction;

  // Drop transactions that are expected to fail onchain.
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
    return null;
  }

  // Prepare nonce + gas settings.
  const nonce = await incrWalletNonce(chainId, from);
  const populatedTransaction = await toSerializableTransaction({
    from,
    transaction: {
      client: thirdwebClient,
      chain: defineChain(chainId),
      ...queuedTransaction,
      nonce,
    },
  });
  job.log(
    `Populated transaction: ${superjson.stringify(populatedTransaction)}`,
  );

  // Send transaction to RPC.
  const account = await getAccount({ chainId, from });
  const { transactionHash } = await account.sendTransaction(
    populatedTransaction,
  );

  return {
    ...queuedTransaction,
    status: "sent",
    nonce,
    retryCount: 0,
    sentAt: new Date(),
    sentAtBlock: await getBlockNumberish(chainId),
    sentTransactionHashes: [transactionHash],
  };
};

const _handleSentTransaction = async (
  job: Job,
  sentTransaction: SentTransaction,
  retryCount: number,
): Promise<SentTransaction> => {
  const { chainId, from } = sentTransaction;

  // Prepare gas settings. Re-use existing nonce.
  const populatedTransaction = await toSerializableTransaction({
    from,
    transaction: {
      client: thirdwebClient,
      chain: defineChain(chainId),
      ...sentTransaction,
    },
  });
  // Double gas for retries.
  if (populatedTransaction.gasPrice) {
    populatedTransaction.gasPrice *= 2n;
  }
  if (populatedTransaction.maxFeePerGas) {
    populatedTransaction.maxFeePerGas *= 2n;
  }
  if (populatedTransaction.maxPriorityFeePerGas) {
    populatedTransaction.maxPriorityFeePerGas *= 2n;
  }

  job.log(
    `Populated transaction: ${superjson.stringify(populatedTransaction)}`,
  );

  // Send transaction to RPC.
  const account = await getAccount({ chainId, from });
  const { transactionHash } = await account.sendTransaction(
    populatedTransaction,
  );

  return {
    ...sentTransaction,
    retryCount,
    sentAt: new Date(),
    sentAtBlock: await getBlockNumberish(chainId),
    sentTransactionHashes: [
      ...sentTransaction.sentTransactionHashes,
      transactionHash,
    ],
  };
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
