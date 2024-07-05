import { Job, Processor, Worker } from "bullmq";
import superjson from "superjson";
import { defineChain, eth_getTransactionReceipt, getRpcClient } from "thirdweb";
import { TransactionDB } from "../../db/transactions/db";
import { getBlockNumberish } from "../../utils/block";
import { getConfig } from "../../utils/cache/getConfig";
import { msSince } from "../../utils/date";
import { env } from "../../utils/env";
import { logger } from "../../utils/logger";
import { redis } from "../../utils/redis/redis";
import { thirdwebClient } from "../../utils/sdk";
import { MinedTransaction } from "../../utils/transaction/types";
import { enqueueTransactionWebhook } from "../../utils/transaction/webhook";
import { reportUsage } from "../../utils/usage";
import { enqueueCancelTransaction } from "../queues/cancelTransactionQueue";
import {
  MINE_TRANSACTION_QUEUE_NAME,
  MineTransactionData,
} from "../queues/mineTransactionQueue";
import { logWorkerEvents } from "../queues/queues";
import { enqueueSendTransaction } from "../queues/sendTransactionQueue";

// @TODO: move to DB config.
const MINE_TIMEOUT_IN_MS = 60 * 60 * 1000; // 1 hour

/**
 * The MINE_TRANSACTION worker is responsible for:
 * - checking if this transaction has completed
 * - getting the receipt for this transaction hash
 * - deciding to cancel or retry the transaction
 */
const handler: Processor<any, void, string> = async (job: Job<string>) => {
  const { queueId } = superjson.parse<MineTransactionData>(job.data);

  // Assert valid transaction state.
  const sentTransaction = await TransactionDB.get(queueId);
  if (sentTransaction?.status !== "sent") {
    job.log(`Invalid transaction state: ${JSON.stringify(sentTransaction)}`);
    return;
  }

  const { chainId, sentTransactionHashes } = sentTransaction;
  const chain = defineChain(chainId);
  const rpcRequest = getRpcClient({
    client: thirdwebClient,
    chain,
  });

  // Check all sent transaction hashes since any retry could succeed.
  const receiptResults = await Promise.allSettled(
    sentTransactionHashes.map((hash) =>
      eth_getTransactionReceipt(rpcRequest, { hash }),
    ),
  );

  // If any receipts are found, this transaction is mined.
  for (const result of receiptResults) {
    if (result.status === "fulfilled") {
      const receipt = result.value;
      job.log(
        `Receipt found: ${sentTransaction.queueId} - ${receipt.transactionHash} `,
      );
      const minedTransaction: MinedTransaction = {
        ...sentTransaction,
        status: "mined",
        transactionHash: receipt.transactionHash,
        minedAt: new Date(),
        minedAtBlock: receipt.blockNumber,
        transactionType: receipt.type,
        onchainStatus: receipt.status,
        gasUsed: receipt.gasUsed,
        effectiveGasPrice: receipt.effectiveGasPrice,
      };
      await TransactionDB.set(minedTransaction);
      await enqueueTransactionWebhook(minedTransaction);
      _reportUsageSuccess(minedTransaction);
      logger({
        level: "info",
        message: `Transaction mined [${sentTransaction.queueId}] - [${receipt.transactionHash}]`,
        service: "worker",
      });
      return;
    }
  }

  // Else the transaction is not mined yet.

  // Cancel the transaction if the timeout is exceeded.
  if (msSince(sentTransaction.sentAt) > MINE_TIMEOUT_IN_MS) {
    job.log("Transaction is unmined after timeout. Cancelling transaction...");
    await enqueueCancelTransaction({ queueId: sentTransaction.queueId });
    return;
  }

  // Retry the transaction.
  const config = await getConfig();
  if (sentTransaction.retryCount < config.maxRetriesPerTx) {
    const ellapsedBlocks =
      (await getBlockNumberish(chainId)) - sentTransaction.sentAtBlock;
    if (ellapsedBlocks >= config.minEllapsedBlocksBeforeRetry) {
      job.log("Transaction is unmined before timeout. Retrying transaction...");
      logger({
        level: "warn",
        message: `Transaction is unmined before timeout: ${sentTransaction.queueId} - ${sentTransaction.sentTransactionHashes[0]} `,
        service: "worker",
      });
      await enqueueSendTransaction({
        queueId: sentTransaction.queueId,
        retryCount: sentTransaction.retryCount + 1,
      });
      return;
    }
  }

  // Otherwise throw to check again later.
  job.log(
    "Transaction is not confirmed before retry deadline. Check again later...",
  );
  throw new Error("NOT_CONFIRMED_YET");
};

const _reportUsageSuccess = (minedTransaction: MinedTransaction) => {
  const chain = defineChain(minedTransaction.chainId);
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

// Worker
const _worker = new Worker(MINE_TRANSACTION_QUEUE_NAME, handler, {
  concurrency: env.CONFIRM_TRANSACTION_QUEUE_CONCURRENCY,
  connection: redis,
});
logWorkerEvents(_worker);
