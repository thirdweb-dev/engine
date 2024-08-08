import assert from "assert";
import { Job, Processor, Worker } from "bullmq";
import superjson from "superjson";
import { Hex, toSerializableTransaction } from "thirdweb";
import { stringify } from "thirdweb/utils";
import { bundleUserOp } from "thirdweb/wallets/smart";
import type { TransactionSerializable } from "viem";
import { getContractAddress } from "viem";
import { TransactionDB } from "../../db/transactions/db";
import {
  acquireNonce,
  addSentNonce,
  rebaseNonce,
  recycleNonce,
} from "../../db/wallets/walletNonce";
import { getAccount } from "../../utils/account";
import { getBlockNumberish } from "../../utils/block";
import { getChain } from "../../utils/chain";
import { msSince } from "../../utils/date";
import { env } from "../../utils/env";
import {
  isNonceAlreadyUsedError,
  isReplacementGasFeeTooLow,
  prettifyError,
} from "../../utils/error";
import { redis } from "../../utils/redis/redis";
import { thirdwebClient } from "../../utils/sdk";
import {
  ErroredTransaction,
  QueuedTransaction,
  SentTransaction,
} from "../../utils/transaction/types";
import { generateSignedUserOperation } from "../../utils/transaction/userOperation";
import { enqueueTransactionWebhook } from "../../utils/transaction/webhook";
import { reportUsage } from "../../utils/usage";
import { MineTransactionQueue } from "../queues/mineTransactionQueue";
import { logWorkerExceptions } from "../queues/queues";
import {
  SendTransactionData,
  SendTransactionQueue,
} from "../queues/sendTransactionQueue";

/**
 * Submit a transaction to RPC (EOA transactions) or bundler (userOps).
 *
 * This worker also handles retried EOA transactions.
 */
const handler: Processor<any, void, string> = async (job: Job<string>) => {
  const { queueId, resendCount } = superjson.parse<SendTransactionData>(
    job.data,
  );

  const transaction = await TransactionDB.get(queueId);
  if (!transaction) {
    job.log(`Invalid transaction state: ${stringify(transaction)}`);
    return;
  }

  // SentTransaction = the transaction or userOp was submitted successfully.
  // ErroredTransaction = the transaction failed and should not be re-attempted.
  // null = the transaction attemped to resend but was not needed. Ignore.
  // A thrown exception indicates a retry-able error occurred (e.g. RPC outage).
  let resultTransaction: SentTransaction | ErroredTransaction | null;
  if (transaction.status === "queued") {
    if (transaction.isUserOp) {
      resultTransaction = await _sendUserOp(job, transaction);
    } else {
      resultTransaction = await _sendTransaction(job, transaction);
    }
  } else if (transaction.status === "sent") {
    resultTransaction = await _resendTransaction(job, transaction, resendCount);
  } else {
    job.log(`Invalid transaction state: ${stringify(transaction)}`);
    return;
  }

  if (resultTransaction) {
    // Handle the resulting "sent" or "errored" transaction.
    await TransactionDB.set(resultTransaction);
    await enqueueTransactionWebhook(resultTransaction);

    if (resultTransaction.status === "sent") {
      job.log(`Transaction sent: ${stringify(resultTransaction)}.`);
      await MineTransactionQueue.add({ queueId: resultTransaction.queueId });

      // Report usage only on the first transaction send.
      if (transaction.status === "queued") {
        await _reportUsageSuccess(resultTransaction);
      }
    } else if (resultTransaction.status === "errored") {
      _reportUsageError(resultTransaction);
    }
  }
};

const _sendUserOp = async (
  job: Job,
  queuedTransaction: QueuedTransaction,
): Promise<SentTransaction | ErroredTransaction> => {
  assert(queuedTransaction.isUserOp);

  const chain = await getChain(queuedTransaction.chainId);
  const signedUserOp = await generateSignedUserOperation(queuedTransaction);
  const userOpHash = await bundleUserOp({
    userOp: signedUserOp,
    options: {
      chain,
      client: thirdwebClient,
    },
  });
  job.log(`Sent transaction: ${userOpHash}`);

  return {
    ...queuedTransaction,
    isUserOp: true,
    status: "sent",
    nonce: signedUserOp.nonce.toString(),
    userOpHash,
    sentAt: new Date(),
    sentAtBlock: await getBlockNumberish(queuedTransaction.chainId),
    maxFeePerGas: signedUserOp.maxFeePerGas,
    maxPriorityFeePerGas: signedUserOp.maxPriorityFeePerGas,
  };
};

const _sendTransaction = async (
  job: Job,
  queuedTransaction: QueuedTransaction,
): Promise<SentTransaction | ErroredTransaction> => {
  assert(!queuedTransaction.isUserOp);

  const { chainId, from } = queuedTransaction;
  const chain = await getChain(chainId);

  // Populate the transaction to resolve gas values.
  // This call throws if the execution would be reverted.
  // The nonce is _not_ set yet.
  let populatedTransaction: TransactionSerializable;
  try {
    populatedTransaction = await toSerializableTransaction({
      from,
      transaction: {
        client: thirdwebClient,
        chain,
        ...queuedTransaction,
      },
    });
  } catch (e: unknown) {
    // If the transaction will revert, error.message contains the human-readable error.
    const errorMessage = (e as Error)?.message ?? `${e}`;
    return {
      ...queuedTransaction,
      status: "errored",
      errorMessage,
    };
  }

  // Acquire an unused nonce for this transaction.
  const { nonce, isRecycledNonce } = await acquireNonce(chainId, from);
  job.log(`Acquired nonce ${nonce}. isRecycledNonce=${isRecycledNonce}`);
  populatedTransaction.nonce = nonce;
  job.log(`Sending transaction: ${stringify(populatedTransaction)}`);

  // Send transaction to RPC.
  // This call throws if the RPC rejects the transaction.
  let transactionHash: Hex;
  try {
    const account = await getAccount({ chainId, from });
    const sendTransactionResult = await account.sendTransaction(
      populatedTransaction,
    );
    transactionHash = sendTransactionResult.transactionHash;
    job.log(`Sent transaction: ${transactionHash}`);
  } catch (error: unknown) {
    // If NonceAlreadyUsedError, which can also manifest as a ReplacementGasFeeTooLowError,
    // recycle the nonce and retry the transaction.
    if (isNonceAlreadyUsedError(error) || isReplacementGasFeeTooLow(error)) {
      const resyncNonce = await rebaseNonce(chainId, from);
      job.log(`Resynced nonce to ${resyncNonce}.`);
    } else {
      job.log(`Recycling nonce: ${nonce}`);
      await recycleNonce(chainId, from, nonce);
    }
    throw error;
  }

  await addSentNonce(chainId, from, nonce);

  return {
    ...queuedTransaction,
    status: "sent",
    isUserOp: false,
    nonce,
    sentTransactionHashes: [transactionHash],
    resendCount: 0,
    sentAt: new Date(),
    sentAtBlock: await getBlockNumberish(chainId),
    gas: populatedTransaction.gas,
    gasPrice: populatedTransaction.gasPrice,
    maxFeePerGas: populatedTransaction.maxFeePerGas,
    maxPriorityFeePerGas: populatedTransaction.maxPriorityFeePerGas,
    deployedContractAddress: _resolveDeployedContractAddress(
      queuedTransaction,
      nonce,
    ),
  };
};

const _resendTransaction = async (
  job: Job,
  sentTransaction: SentTransaction,
  resendCount: number,
): Promise<SentTransaction | null> => {
  assert(!sentTransaction.isUserOp);

  // Populate the transaction with double gas.
  const { chainId, from } = sentTransaction;
  const populatedTransaction = await toSerializableTransaction({
    from,
    transaction: {
      client: thirdwebClient,
      chain: await getChain(chainId),
      ...sentTransaction,
      // Unset gas values so it can be re-populated.
      gasPrice: undefined,
      maxFeePerGas: undefined,
      maxPriorityFeePerGas: undefined,
    },
  });
  if (populatedTransaction.gasPrice) {
    populatedTransaction.gasPrice *= 2n;
  }
  if (populatedTransaction.maxFeePerGas) {
    populatedTransaction.maxFeePerGas *= 2n;
  }
  if (populatedTransaction.maxPriorityFeePerGas) {
    populatedTransaction.maxPriorityFeePerGas *= 2n;
  }

  // Important: Don't acquire a different nonce.

  job.log(`Sending transaction: ${stringify(populatedTransaction)}`);

  // Send transaction to RPC.
  // This call throws if the RPC rejects the transaction.
  let transactionHash: Hex;
  try {
    const account = await getAccount({ chainId, from });
    const sendTransactionResult = await account.sendTransaction(
      populatedTransaction,
    );
    transactionHash = sendTransactionResult.transactionHash;
    job.log(`Sent transaction: ${transactionHash}`);
  } catch (error) {
    if (isNonceAlreadyUsedError(error)) {
      job.log(
        "Nonce used. This transaction was likely already mined. Do not resend.",
      );
      return null;
    }
    if (isReplacementGasFeeTooLow(error)) {
      job.log("A pending transaction exists with >= gas fees. Do not resend.");
      return null;
    }
    throw error;
  }

  return {
    ...sentTransaction,
    resendCount,
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

const _resolveDeployedContractAddress = (
  queuedTransaction: QueuedTransaction,
  nonce: number,
) => {
  if (queuedTransaction.deployedContractAddress) {
    return queuedTransaction.deployedContractAddress;
  }

  if (
    queuedTransaction.extension === "deploy-published" &&
    queuedTransaction.functionName === "deploy"
  ) {
    return getContractAddress({
      from: queuedTransaction.from,
      nonce: BigInt(nonce),
    });
  }
};

// Must be explicitly called for the worker to run on this host.
export const initSendTransactionWorker = () => {
  const _worker = new Worker(SendTransactionQueue.q.name, handler, {
    concurrency: env.SEND_TRANSACTION_QUEUE_CONCURRENCY,
    connection: redis,
  });
  logWorkerExceptions(_worker);

  // If a transaction fails to send after all retries, error it.
  _worker.on("failed", async (job: Job<string> | undefined, error: Error) => {
    if (job && job.attemptsMade === job.opts.attempts) {
      const { queueId } = superjson.parse<SendTransactionData>(job.data);
      const transaction = await TransactionDB.get(queueId);
      if (transaction) {
        const erroredTransaction: ErroredTransaction = {
          ...transaction,
          status: "errored",
          errorMessage: await prettifyError(transaction, error),
        };
        job.log(`Transaction errored: ${stringify(erroredTransaction)}`);

        await TransactionDB.set(erroredTransaction);
        await enqueueTransactionWebhook(erroredTransaction);
        _reportUsageError(erroredTransaction);
      }
    }
  });
};
