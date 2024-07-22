import { Job, Processor, Worker } from "bullmq";
import superjson from "superjson";
import {
  Address,
  eth_getTransactionByHash,
  eth_getTransactionReceipt,
  getRpcClient,
} from "thirdweb";
import { stringify } from "thirdweb/utils";
import { getUserOpReceiptRaw } from "thirdweb/wallets/smart";
import { TransactionDB } from "../../db/transactions/db";
import { getBlockNumberish } from "../../utils/block";
import { getConfig } from "../../utils/cache/getConfig";
import { getChain } from "../../utils/chain";
import { msSince } from "../../utils/date";
import { env } from "../../utils/env";
import { logger } from "../../utils/logger";
import { redis } from "../../utils/redis/redis";
import { thirdwebClient } from "../../utils/sdk";
import {
  ErroredTransaction,
  MinedTransaction,
  SentTransaction,
} from "../../utils/transaction/types";
import { enqueueTransactionWebhook } from "../../utils/transaction/webhook";
import { reportUsage } from "../../utils/usage";
import { CancelTransactionQueue } from "../queues/cancelTransactionQueue";
import {
  MineTransactionData,
  MineTransactionQueue,
} from "../queues/mineTransactionQueue";
import { SendTransactionQueue } from "../queues/sendTransactionQueue";

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
    job.log(`Invalid transaction state: ${stringify(sentTransaction)}`);
    return;
  }

  // Handle user operation or EOA transaction.
  let resultTransaction: MinedTransaction | null;
  if (sentTransaction.isUserOp) {
    resultTransaction = await _handleUserOp(job, sentTransaction);
  } else {
    resultTransaction = await _handleTransaction(job, sentTransaction);
  }

  // Handle a successfully mined transaction.
  if (resultTransaction?.status === "mined") {
    await TransactionDB.set(resultTransaction);
    await enqueueTransactionWebhook(resultTransaction);
    await _reportUsageSuccess(resultTransaction);
    logger({
      level: "info",
      queueId: resultTransaction.queueId,
      message: `Transaction mined [${resultTransaction.transactionHash}]`,
      service: "worker",
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

const _handleTransaction = async (
  job: Job,
  sentTransaction: SentTransaction & { isUserOp: false },
): Promise<MinedTransaction | null> => {
  const { queueId, chainId, sentTransactionHashes } = sentTransaction;

  const chain = await getChain(chainId);
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
      job.log(`Receipt found: ${receipt.transactionHash} `);
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
      };
    }
  }

  // Else the transaction is not mined yet.

  // Retry the transaction (after some initial delay).
  const config = await getConfig();
  if (sentTransaction.retryCount < config.maxRetriesPerTx) {
    const ellapsedBlocks =
      (await getBlockNumberish(chainId)) - sentTransaction.sentAtBlock;
    if (ellapsedBlocks >= config.minEllapsedBlocksBeforeRetry) {
      job.log("Transaction is unmined before timeout. Retrying transaction...");
      logger({
        level: "warn",
        queueId,
        message: `Transaction is unmined before timeout: ${sentTransaction.sentTransactionHashes[0]} `,
        service: "worker",
      });
      await SendTransactionQueue.add({
        queueId,
        retryCount: sentTransaction.retryCount + 1,
      });
      // After retrying, do not return. Throw because this job continues to mine this queueId.
    }
  }

  // If the transaction is not mined yet, throw to retry later.
  job.log(
    `Transaction is not mined yet (${sentTransactionHashes}). Check again later...`,
  );
  throw new Error("NOT_CONFIRMED_YET");
};

const _handleUserOp = async (
  job: Job,
  sentTransaction: SentTransaction & { isUserOp: true },
): Promise<MinedTransaction> => {
  const { chainId, userOpHash } = sentTransaction;
  const chain = await getChain(chainId);
  const rpcRequest = getRpcClient({
    client: thirdwebClient,
    chain,
  });

  const userOpReceiptRaw = await getUserOpReceiptRaw({
    client: thirdwebClient,
    chain,
    userOpHash,
  });
  if (userOpReceiptRaw) {
    const transaction = await eth_getTransactionByHash(rpcRequest, {
      hash: userOpReceiptRaw.receipt.transactionHash,
    });
    const transactionReceipt = await eth_getTransactionReceipt(rpcRequest, {
      hash: transaction.hash,
    });
    return {
      ...sentTransaction,
      status: "mined",
      transactionHash: transactionReceipt.transactionHash,
      minedAt: new Date(),
      minedAtBlock: transactionReceipt.blockNumber,
      transactionType: transactionReceipt.type,
      onchainStatus: transactionReceipt.status,
      gasUsed: transactionReceipt.gasUsed,
      effectiveGasPrice: transactionReceipt.effectiveGasPrice,
      gas: transactionReceipt.gasUsed,
      cumulativeGasUsed: transactionReceipt.cumulativeGasUsed,
      sender: userOpReceiptRaw.sender as Address,
    };
  }

  // If the transaction is not mined yet, throw to retry later.
  job.log("Transaction is not mined yet. Check again later...");
  throw new Error("NOT_CONFIRMED_YET");
};

// Worker
const _worker = new Worker(MineTransactionQueue.name, handler, {
  concurrency: env.CONFIRM_TRANSACTION_QUEUE_CONCURRENCY,
  connection: redis,
});

// If a transaction fails to mine after all retries, cancel it.
_worker.on("failed", async (job: Job<string> | undefined) => {
  if (job && job.attemptsMade === job.opts.attempts) {
    const { queueId } = superjson.parse<MineTransactionData>(job.data);

    const sentTransaction = await TransactionDB.get(queueId);
    if (sentTransaction?.status !== "sent") {
      job.log(`Invalid transaction state: ${stringify(sentTransaction)}`);
      return;
    }

    if (sentTransaction.isUserOp) {
      // If userOp, set as errored.
      job.log("Transaction is unmined after timeout. Erroring transaction...");
      const erroredTransaction: ErroredTransaction = {
        ...sentTransaction,
        status: "errored",
        errorMessage: "Transaction Timed out.",
      };
      await TransactionDB.set(erroredTransaction);
      await enqueueTransactionWebhook(erroredTransaction);
      _reportUsageError(erroredTransaction);
    } else {
      // If EOA transaction, enqueue a cancel job.
      job.log(
        "Transaction is unmined after timeout. Cancelling transaction...",
      );
      await CancelTransactionQueue.add({ queueId });
    }
  }
});
