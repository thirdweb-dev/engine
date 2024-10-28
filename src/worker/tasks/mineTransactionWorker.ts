import { Worker, type Job, type Processor } from "bullmq";
import assert from "node:assert";
import superjson from "superjson";
import {
  eth_getTransactionByHash,
  eth_getTransactionReceipt,
  getAddress,
  getRpcClient,
  type Address,
} from "thirdweb";
import { stringify } from "thirdweb/utils";
import { getUserOpReceipt, getUserOpReceiptRaw } from "thirdweb/wallets/smart";
import { TransactionDB } from "../../db/transactions/db";
import { recycleNonce, removeSentNonce } from "../../db/wallets/walletNonce";
import { getBlockNumberish } from "../../utils/block";
import { getConfig } from "../../utils/cache/getConfig";
import { getChain } from "../../utils/chain";
import { msSince } from "../../utils/date";
import { env } from "../../utils/env";
import { logger } from "../../utils/logger";
import { recordMetrics } from "../../utils/prometheus";
import { redis } from "../../utils/redis/redis";
import { thirdwebClient } from "../../utils/sdk";
import type {
  ErroredTransaction,
  MinedTransaction,
  SentTransaction,
} from "../../utils/transaction/types";
import { enqueueTransactionWebhook } from "../../utils/transaction/webhook";
import { reportUsage } from "../../utils/usage";
import {
  MineTransactionQueue,
  type MineTransactionData,
} from "../queues/mineTransactionQueue";
import { SendTransactionQueue } from "../queues/sendTransactionQueue";

/**
 * Check if the submitted transaction or userOp is mined onchain.
 *
 * If an EOA transaction is not mined after some time, resend it.
 */
const handler: Processor<any, void, string> = async (job: Job<string>) => {
  const { queueId } = superjson.parse<MineTransactionData>(job.data);

  // Assert valid transaction state.
  const sentTransaction = await TransactionDB.get(queueId);
  if (sentTransaction?.status !== "sent") {
    job.log(`Invalid transaction state: ${stringify(sentTransaction)}`);
    return;
  }

  // MinedTransaction = the transaction or userOp was mined.
  // null = the transaction or userOp is not yet mined.
  let resultTransaction: MinedTransaction | null;
  if (sentTransaction.isUserOp) {
    resultTransaction = await _mineUserOp(job, sentTransaction);
  } else {
    resultTransaction = await _mineTransaction(job, sentTransaction);
  }

  if (!resultTransaction) {
    job.log("Transaction is not mined yet. Check again later...");
    throw new Error("NOT_CONFIRMED_YET");
  }

  if (resultTransaction.status === "mined") {
    await TransactionDB.set(resultTransaction);
    await enqueueTransactionWebhook(resultTransaction);
    await _reportUsageSuccess(resultTransaction);
    recordMetrics({
      event: "transaction_mined",
      params: {
        chainId: resultTransaction.chainId.toString(),
        queuedToMinedDurationSeconds:
          msSince(resultTransaction.queuedAt) / 1000,
        durationSeconds: msSince(resultTransaction.sentAt) / 1000,
        walletAddress: getAddress(resultTransaction.from),
      },
    });
  }
};

const _reportUsageSuccess = async (minedTransaction: MinedTransaction) => {
  const chain = await getChain(minedTransaction.chainId);
  reportUsage([
    {
      action: "mine_tx",
      input: {
        ...minedTransaction,
        provider: chain.rpc,
        msSinceQueue: msSince(minedTransaction.queuedAt),
        msSinceSend: msSince(minedTransaction.sentAt),
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

const _mineTransaction = async (
  job: Job,
  sentTransaction: SentTransaction,
): Promise<MinedTransaction | null> => {
  assert(!sentTransaction.isUserOp);

  const { queueId, chainId, sentTransactionHashes, sentAtBlock, resendCount } =
    sentTransaction;

  // Check all sent transaction hashes since any of them might succeed.
  const rpcRequest = getRpcClient({
    client: thirdwebClient,
    chain: await getChain(chainId),
  });
  job.log(`Mining transactionHashes: ${sentTransactionHashes}`);
  const receiptResults = await Promise.allSettled(
    sentTransactionHashes.map((hash) =>
      eth_getTransactionReceipt(rpcRequest, { hash }),
    ),
  );

  // This transaction is mined if any receipt is found.
  for (const result of receiptResults) {
    if (result.status === "fulfilled") {
      const receipt = result.value;
      job.log(`Found receipt on block ${receipt.blockNumber}.`);

      const removed = await removeSentNonce(
        sentTransaction.chainId,
        sentTransaction.from,
        sentTransaction.nonce,
      );

      logger({
        level: "debug",
        message: `[mineTransactionWorker] Removed nonce ${sentTransaction.nonce} from nonce-sent set: ${removed}`,
        service: "worker",
      });

      const errorMessage =
        receipt.status === "reverted"
          ? "The transaction failed onchain. See: https://portal.thirdweb.com/engine/troubleshooting"
          : undefined;

      return {
        ...sentTransaction,
        status: "mined",
        transactionHash: receipt.transactionHash,
        minedAt: new Date(),
        minedAtBlock: receipt.blockNumber,
        transactionType: receipt.type,
        onchainStatus: receipt.status,
        gasUsed: receipt.gasUsed,
        effectiveGasPrice: receipt.effectiveGasPrice,
        cumulativeGasUsed: receipt.cumulativeGasUsed,
        errorMessage,
      };
    }
  }
  // Else the transaction is not mined yet.

  // Resend the transaction (after some initial delay).
  const config = await getConfig();
  const blockNumber = await getBlockNumberish(chainId);
  const ellapsedBlocks = blockNumber - sentAtBlock;
  if (ellapsedBlocks >= config.minEllapsedBlocksBeforeRetry) {
    job.log(
      `Resending transaction after ${ellapsedBlocks} blocks. blockNumber=${blockNumber} sentAtBlock=${sentAtBlock}`,
    );
    await SendTransactionQueue.add({
      queueId,
      resendCount: resendCount + 1,
    });
  }

  return null;
};

const _mineUserOp = async (
  job: Job,
  sentTransaction: SentTransaction,
): Promise<MinedTransaction | null> => {
  assert(sentTransaction.isUserOp);

  const { chainId, userOpHash } = sentTransaction;
  const chain = await getChain(chainId);

  job.log(`Mining userOpHash: ${userOpHash}`);
  const userOpReceiptRaw = await getUserOpReceiptRaw({
    client: thirdwebClient,
    chain,
    userOpHash,
  });

  if (!userOpReceiptRaw) {
    return null;
  }

  const { transactionHash } = userOpReceiptRaw.receipt;
  job.log(`Found transactionHash: ${transactionHash}`);

  const rpcRequest = getRpcClient({ client: thirdwebClient, chain });
  const transaction = await eth_getTransactionByHash(rpcRequest, {
    hash: transactionHash,
  });
  const receipt = await eth_getTransactionReceipt(rpcRequest, {
    hash: transaction.hash,
  });

  let errorMessage: string | undefined;

  // if the userOpReceipt is not successful, try to get the parsed userOpReceipt
  // we expect this to fail, but we want the error message if it does
  if (!userOpReceiptRaw.success) {
    try {
      const userOpReceipt = await getUserOpReceipt({
        client: thirdwebClient,
        chain,
        userOpHash,
      });
      await job.log(`Found userOpReceipt: ${userOpReceipt}`);
    } catch (e) {
      if (e instanceof Error) {
        errorMessage = e.message;
        await job.log(`Failed to get userOpReceipt: ${e.message}`);
      } else {
        throw e;
      }
    }
  }

  return {
    ...sentTransaction,
    status: "mined",
    transactionHash: receipt.transactionHash,
    minedAt: new Date(),
    minedAtBlock: receipt.blockNumber,
    transactionType: receipt.type,
    onchainStatus: userOpReceiptRaw.success ? "success" : "reverted",
    gasUsed: receipt.gasUsed,
    effectiveGasPrice: receipt.effectiveGasPrice,
    gas: receipt.gasUsed,
    cumulativeGasUsed: receipt.cumulativeGasUsed,
    sender: userOpReceiptRaw.sender as Address,
    nonce: userOpReceiptRaw.nonce.toString(),
    errorMessage,
  };
};

// Must be explicitly called for the worker to run on this host.
export const initMineTransactionWorker = () => {
  const _worker = new Worker(MineTransactionQueue.q.name, handler, {
    concurrency: env.CONFIRM_TRANSACTION_QUEUE_CONCURRENCY,
    connection: redis,
    settings: {
      backoffStrategy: (attemptsMade: number) => {
        // Retries at 2s, 4s, 6s, ..., 18s, 20s, 20s, 20s, ...
        return Math.min(attemptsMade * 2_000, 20_000);
      },
    },
  });

  // If a transaction fails to mine after all retries, set it as errored and release the nonce.
  _worker.on("failed", async (job: Job<string> | undefined) => {
    if (job && job.attemptsMade === job.opts.attempts) {
      const { queueId } = superjson.parse<MineTransactionData>(job.data);

      const sentTransaction = await TransactionDB.get(queueId);
      if (sentTransaction?.status !== "sent") {
        job.log(`Invalid transaction state: ${stringify(sentTransaction)}`);
        return;
      }

      const erroredTransaction: ErroredTransaction = {
        ...sentTransaction,
        status: "errored",
        errorMessage: "Transaction timed out.",
      };
      job.log(`Transaction timed out: ${stringify(erroredTransaction)}`);

      await TransactionDB.set(erroredTransaction);
      await enqueueTransactionWebhook(erroredTransaction);
      _reportUsageError(erroredTransaction);

      if (!sentTransaction.isUserOp) {
        // Release the nonce to allow it to be reused or cancelled.
        job.log(
          `Recycling nonce and removing from nonce-sent: ${sentTransaction.nonce}`,
        );
        await recycleNonce(
          sentTransaction.chainId,
          sentTransaction.from,
          sentTransaction.nonce,
        );

        await removeSentNonce(
          sentTransaction.chainId,
          sentTransaction.from,
          sentTransaction.nonce,
        );
      }
    }
  });
};
