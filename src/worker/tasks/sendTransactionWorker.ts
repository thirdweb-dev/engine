import { Job, Processor, Worker } from "bullmq";
import superjson from "superjson";
import { toSerializableTransaction } from "thirdweb";
import { stringify } from "thirdweb/utils";
import { bundleUserOp } from "thirdweb/wallets/smart";
import { TransactionDB } from "../../db/transactions/db";
import { incrWalletNonce } from "../../db/wallets/walletNonce";
import { getAccount } from "../../utils/account";
import { getBlockNumberish } from "../../utils/block";
import { getChain } from "../../utils/chain";
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
import {
  generateSignedUserOperation,
  isUserOperation,
} from "../../utils/transaction/userOperation";
import { enqueueTransactionWebhook } from "../../utils/transaction/webhook";
import { reportUsage } from "../../utils/usage";
import { MineTransactionQueue } from "../queues/mineTransactionQueue";
import {
  SendTransactionData,
  SendTransactionQueue,
} from "../queues/sendTransactionQueue";

const handler: Processor<any, void, string> = async (job: Job<string>) => {
  const { queueId, retryCount } = superjson.parse<SendTransactionData>(
    job.data,
  );

  const transaction = await TransactionDB.get(queueId);

  let resultTransaction: SentTransaction | ErroredTransaction;
  switch (transaction?.status) {
    case "queued":
      // Send a transaction for the first time.
      resultTransaction = await _handleQueuedTransaction(job, transaction);
      break;
    case "sent":
      // Retry a stuck transaction.
      resultTransaction = await _handleSentTransaction(
        job,
        transaction,
        retryCount,
      );
      break;
    default:
      job.log(`Invalid transaction state: ${stringify(transaction)}`);
      return;
  }

  // Handle the resulting "sent" or "errored" transaction.
  await TransactionDB.set(resultTransaction);
  await enqueueTransactionWebhook(resultTransaction);

  if (resultTransaction.status === "sent") {
    job.log(`Transaction sent: ${stringify(resultTransaction)}.`);
    await MineTransactionQueue.add({ queueId: resultTransaction.queueId });
    await _reportUsageSuccess(resultTransaction);
  } else if (resultTransaction.status === "errored") {
    _reportUsageError(resultTransaction);
  }
};

const _handleQueuedTransaction = async (
  job: Job,
  queuedTransaction: QueuedTransaction,
): Promise<SentTransaction | ErroredTransaction> => {
  const { chainId, from } = queuedTransaction;
  const chain = await getChain(chainId);

  const simulateError = await simulateQueuedTransaction(queuedTransaction);
  if (simulateError) {
    return {
      ...queuedTransaction,
      status: "errored",
      errorMessage: simulateError,
    };
  }

  // Handle sending an AA user operation.
  const isUserOp = isUserOperation(queuedTransaction);
  if (isUserOp) {
    const signedUserOp = await generateSignedUserOperation(queuedTransaction);
    const userOpHash = await bundleUserOp({
      userOp: signedUserOp,
      options: {
        chain,
        client: thirdwebClient,
      },
    });

    return {
      ...queuedTransaction,
      status: "sent",
      isUserOp: true,
      nonce: signedUserOp.nonce.toString(),
      userOpHash,
      retryCount: 0,
      sentAt: new Date(),
      sentAtBlock: await getBlockNumberish(chainId),
      maxFeePerGas: signedUserOp.maxFeePerGas,
      maxPriorityFeePerGas: signedUserOp.maxPriorityFeePerGas,
    };
  }

  // Prepare nonce + gas settings.
  const populatedTransaction = await toSerializableTransaction({
    from,
    transaction: {
      client: thirdwebClient,
      chain,
      ...queuedTransaction,
    },
  });
  job.log(`Populated transaction: ${stringify(populatedTransaction)}`);

  // If likely to succeed onchain, increment the nonce.
  populatedTransaction.nonce = await incrWalletNonce(chainId, from);

  // Send transaction to RPC.
  const account = await getAccount({ chainId, from });
  const { transactionHash } = await account.sendTransaction(
    populatedTransaction,
  );

  return {
    ...queuedTransaction,
    status: "sent",
    isUserOp: false,
    nonce: populatedTransaction.nonce,
    sentTransactionHashes: [transactionHash],
    retryCount: 0,
    sentAt: new Date(),
    sentAtBlock: await getBlockNumberish(chainId),
    gas: populatedTransaction.gas,
    gasPrice: populatedTransaction.gasPrice,
    maxFeePerGas: populatedTransaction.maxFeePerGas,
    maxPriorityFeePerGas: populatedTransaction.maxPriorityFeePerGas,
  };
};

const _handleSentTransaction = async (
  job: Job,
  sentTransaction: SentTransaction,
  retryCount: number,
): Promise<SentTransaction | ErroredTransaction> => {
  const { chainId, from } = sentTransaction;
  if (sentTransaction.isUserOp) {
    throw new Error("Cannot retry a userOp.");
  }

  const populatedTransaction = await toSerializableTransaction({
    from,
    transaction: {
      client: thirdwebClient,
      chain: await getChain(chainId),
      ...sentTransaction,
      // Redundant but explicitly re-use the existing nonce.
      nonce: sentTransaction.nonce,
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
  job.log(`Populated transaction: ${stringify(populatedTransaction)}`);

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
    gas: populatedTransaction.gas,
    gasPrice: populatedTransaction.gasPrice,
    maxFeePerGas: populatedTransaction.maxFeePerGas,
    maxPriorityFeePerGas: populatedTransaction.maxPriorityFeePerGas,
  };
};

const _reportUsageSuccess = async (sentTransaction: SentTransaction) => {
  const chain = await getChain(sentTransaction.chainId);
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
const _worker = new Worker(SendTransactionQueue.name, handler, {
  concurrency: env.SEND_TRANSACTION_QUEUE_CONCURRENCY,
  connection: redis,
});

// If a transaction fails to send after all retries, error it.
_worker.on("failed", async (job: Job<string> | undefined, error: Error) => {
  if (job && job.attemptsMade === job.opts.attempts) {
    job.log(`Transaction errored: ${error.message}`);

    const { queueId } = superjson.parse<SendTransactionData>(job.data);
    const transaction = await TransactionDB.get(queueId);
    if (transaction) {
      const erroredTransaction: ErroredTransaction = {
        ...transaction,
        status: "errored",
        errorMessage: error.message,
      };
      await TransactionDB.set(erroredTransaction);
      await enqueueTransactionWebhook(erroredTransaction);
      _reportUsageError(erroredTransaction);
    }
  }
});
