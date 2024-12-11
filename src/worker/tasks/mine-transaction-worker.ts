import { Worker, type Job, type Processor } from "bullmq";
import assert from "node:assert";
import superjson from "superjson";
import {
  eth_getBalance,
  getAddress,
  getRpcClient,
  toTokens,
  type Address,
} from "thirdweb";
import { stringify } from "thirdweb/utils";
import { getUserOpReceipt } from "thirdweb/wallets/smart";
import { TransactionDB } from "../../shared/db/transactions/db";
import {
  recycleNonce,
  removeSentNonce,
} from "../../shared/db/wallets/wallet-nonce";
import {
  getReceiptForEOATransaction,
  getReceiptForUserOp,
} from "../../shared/lib/transaction/get-transaction-receipt";
import { WebhooksEventTypes } from "../../shared/schemas/webhooks";
import { getBlockNumberish } from "../../shared/utils/block";
import { getConfig } from "../../shared/utils/cache/get-config";
import { getWebhooksByEventType } from "../../shared/utils/cache/get-webhook";
import { getChain } from "../../shared/utils/chain";
import { msSince } from "../../shared/utils/date";
import { env } from "../../shared/utils/env";
import { prettifyError } from "../../shared/utils/error";
import { logger } from "../../shared/utils/logger";
import { recordMetrics } from "../../shared/utils/prometheus";
import { redis } from "../../shared/utils/redis/redis";
import { thirdwebClient } from "../../shared/utils/sdk";
import type {
  ErroredTransaction,
  MinedTransaction,
  SentTransaction,
} from "../../shared/utils/transaction/types";
import { enqueueTransactionWebhook } from "../../shared/utils/transaction/webhook";
import { reportUsage } from "../../shared/utils/usage";
import {
  MineTransactionQueue,
  type MineTransactionData,
} from "../queues/mine-transaction-queue";
import { SendTransactionQueue } from "../queues/send-transaction-queue";
import { SendWebhookQueue } from "../queues/send-webhook-queue";

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
    throw new Error("NOT_CONFIRMED_YET");
  }

  if (resultTransaction.status === "mined") {
    await TransactionDB.set(resultTransaction);
    await enqueueTransactionWebhook(resultTransaction);
    await _notifyIfLowBalance(resultTransaction);
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

  const receipt = await getReceiptForEOATransaction(sentTransaction);

  if (receipt) {
    job.log(
      `Found receipt. transactionHash=${receipt.transactionHash} block=${receipt.blockNumber}`,
    );

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

    // Though the transaction is mined successfully, set an error message if the transaction failed onchain.
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

  // Else the transaction is not mined yet.
  const elapsedSeconds = msSince(sentTransaction.sentAt) / 1000;
  job.log(
    `Transaction is not mined yet. Check again later. elapsed=${elapsedSeconds}s`,
  );

  // Resend the transaction if `minEllapsedBlocksBeforeRetry` blocks or 120 seconds have passed since the last send attempt.
  const config = await getConfig();
  const blockNumber = await getBlockNumberish(sentTransaction.chainId);
  const elapsedBlocks = blockNumber - sentTransaction.sentAtBlock;
  const shouldResend =
    elapsedBlocks >= config.minEllapsedBlocksBeforeRetry ||
    elapsedSeconds > 120;
  if (shouldResend) {
    job.log(
      `Resending transaction after ${elapsedBlocks} blocks. blockNumber=${blockNumber} sentAtBlock=${sentTransaction.sentAtBlock}`,
    );
    await SendTransactionQueue.add({
      queueId: sentTransaction.queueId,
      resendCount: sentTransaction.resendCount + 1,
    });
  }

  return null;
};

const _mineUserOp = async (
  job: Job,
  sentTransaction: SentTransaction,
): Promise<MinedTransaction | null> => {
  assert(sentTransaction.isUserOp);

  const userOpReceipt = await getReceiptForUserOp(sentTransaction);
  if (!userOpReceipt) {
    job.log(
      `UserOp is not mined yet. Check again later. userOpHash=${sentTransaction.userOpHash}`,
    );
    return null;
  }
  const { receipt } = userOpReceipt;

  job.log(
    `Found receipt. transactionHash=${receipt.transactionHash} block=${receipt.blockNumber}`,
  );

  let errorMessage: string | undefined;

  // if the userOpReceipt is not successful, try to get the parsed userOpReceipt
  // we expect this to fail, but we want the error message if it does
  if (!userOpReceipt.success) {
    try {
      const chain = await getChain(sentTransaction.chainId);
      const userOpReceipt = await getUserOpReceipt({
        client: thirdwebClient,
        chain,
        userOpHash: sentTransaction.userOpHash,
      });
      job.log(`Found userOpReceipt: ${userOpReceipt}`);
    } catch (e) {
      if (e instanceof Error) {
        errorMessage = e.message;
        job.log(`Failed to get userOpReceipt: ${e.message}`);
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
    onchainStatus: userOpReceipt.success ? "success" : "reverted",
    gasUsed: receipt.gasUsed,
    effectiveGasPrice: receipt.effectiveGasPrice,
    gas: receipt.gasUsed,
    cumulativeGasUsed: receipt.cumulativeGasUsed,
    sender: userOpReceipt.sender as Address,
    nonce: userOpReceipt.nonce.toString(),
    errorMessage,
  };
};

const _notifyIfLowBalance = async (transaction: MinedTransaction) => {
  const { isUserOp, chainId, from } = transaction;
  if (isUserOp) {
    // Skip for userOps since they may not use the wallet's gas balance.
    return;
  }

  try {
    const webhooks = await getWebhooksByEventType(
      WebhooksEventTypes.BACKEND_WALLET_BALANCE,
    );
    if (webhooks.length === 0) {
      // Skip if no webhooks configured.
      return;
    }

    // Set a key with 5min TTL if it doesn't exist.
    // This effectively throttles this check once every 5min.
    const throttleKey = `webhook:${WebhooksEventTypes.BACKEND_WALLET_BALANCE}:${chainId}:${from}`;
    const isThrottled =
      (await redis.set(throttleKey, "", "EX", 5 * 60, "NX")) === null;
    if (isThrottled) {
      return;
    }

    // Get the current wallet balance.
    const rpcRequest = getRpcClient({
      client: thirdwebClient,
      chain: await getChain(chainId),
    });
    const currentBalance = await eth_getBalance(rpcRequest, {
      address: from,
    });

    const config = await getConfig();
    if (currentBalance >= BigInt(config.minWalletBalance)) {
      // Skip if the balance is above the alert threshold.
      return;
    }

    await SendWebhookQueue.enqueueWebhook({
      type: WebhooksEventTypes.BACKEND_WALLET_BALANCE,
      body: {
        chainId,
        walletAddress: from,
        minimumBalance: config.minWalletBalance,
        currentBalance: currentBalance.toString(),
        message: `LowBalance: The backend wallet ${from} on chain ${chainId} has ${toTokens(currentBalance, 18)} gas remaining.`,
      },
    });
  } catch (e) {
    logger({
      level: "warn",
      message: `[mineTransactionWorker] Error sending low balance notification: ${prettifyError(e)}`,
      service: "worker",
    });
  }
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
