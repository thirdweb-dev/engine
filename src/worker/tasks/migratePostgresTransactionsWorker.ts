import { Transactions } from "@prisma/client";
import assert from "assert";
import { Job, Processor, Worker } from "bullmq";
import { Hex } from "thirdweb";
import { getPrismaWithPostgresTx, prisma } from "../../db/client";
import { TransactionDB } from "../../db/transactions/db";
import { PrismaTransaction } from "../../schema/prisma";
import { getConfig } from "../../utils/cache/getConfig";
import { logger } from "../../utils/logger";
import { maybeBigInt, normalizeAddress } from "../../utils/primitiveTypes";
import { redis } from "../../utils/redis/redis";
import {
  QueuedTransaction,
  SentTransaction,
} from "../../utils/transaction/types";
import { MigratePostgresTransactionsQueue } from "../queues/migratePostgresTransactionsQueue";
import { MineTransactionQueue } from "../queues/mineTransactionQueue";
import { logWorkerExceptions } from "../queues/queues";
import { SendTransactionQueue } from "../queues/sendTransactionQueue";

// Must be explicitly called for the worker to run on this host.
export const initMigratePostgresTransactionsWorker = async () => {
  const config = await getConfig();
  if (config.minedTxListenerCronSchedule) {
    MigratePostgresTransactionsQueue.q.add("cron", "", {
      repeat: { pattern: config.minedTxListenerCronSchedule },
      jobId: "migrate-postgres-transactions-cron",
    });
  }

  const _worker = new Worker(MigratePostgresTransactionsQueue.q.name, handler, {
    connection: redis,
    concurrency: 1,
  });
  logWorkerExceptions(_worker);
};

export const sleep = async (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms, null));

const handler: Processor<any, void, string> = async (job: Job<string>) => {
  // Migrate sent transactions from PostgresDB -> Redis queue.
  await prisma.$transaction(async (pgtx) => {
    const sentTransactionRows = await getSentPostgresTransactions(pgtx);
    const toCancel: string[] = [];

    for (const row of sentTransactionRows) {
      // Update DB, enqueue a "MineTransaction" job, and cancel the transaction in DB.
      try {
        const sentTransaction = toSentTransaction(row);
        await TransactionDB.set(sentTransaction);
        await MineTransactionQueue.add({ queueId: sentTransaction.queueId });
        toCancel.push(row.id);
        job.log(`Migrated sent transaction ${row.id}.`);
      } catch (e) {
        const errorMessage = `Error migrating sent transaction: ${e}`;
        job.log(errorMessage);
        logger({
          service: "worker",
          level: "error",
          queueId: row.id,
          message: errorMessage,
        });
      }
    }

    await cancelPostgresTransactions({ pgtx, queueIds: toCancel });
    job.log(`Done migrating ${toCancel.length} sent transactions.`);
  });

  // Migrate queued transactions from PostgresDB -> Redis queue.
  await prisma.$transaction(async (pgtx) => {
    const queuedTransactionRows = await getQueuedPostgresTransactions(pgtx);
    const toCancel: string[] = [];

    for (const row of queuedTransactionRows) {
      // Update DB, enqueue a "MineTransaction" job, and cancel the transaction in DB.
      try {
        const queuedTransaction = toQueuedTransaction(row);
        await TransactionDB.set(queuedTransaction);
        await SendTransactionQueue.add({
          queueId: queuedTransaction.queueId,
          resendCount: 0,
        });
        toCancel.push(row.id);
        job.log(`Migrated queued transaction ${row.id}.`);
      } catch (e) {
        const errorMessage = `Error migrating sent transaction: ${e}`;
        job.log(errorMessage);
        logger({
          service: "worker",
          level: "error",
          queueId: row.id,
          message: errorMessage,
        });
      }
    }

    await cancelPostgresTransactions({ pgtx, queueIds: toCancel });
    job.log(`Done migrating ${toCancel.length} queued transactions.`);
  });
};

const cancelPostgresTransactions = async ({
  pgtx,
  queueIds,
}: {
  pgtx: PrismaTransaction;
  queueIds: string[];
}) => {
  if (queueIds.length === 0) {
    return;
  }

  const cancelledAt = new Date();
  const prisma = getPrismaWithPostgresTx(pgtx);
  await prisma.transactions.updateMany({
    where: { id: { in: queueIds } },
    data: { cancelledAt },
  });
};

const getSentPostgresTransactions = async (
  pgtx: PrismaTransaction,
): Promise<Transactions[]> => {
  const config = await getConfig();
  const prisma = getPrismaWithPostgresTx(pgtx);

  return await prisma.$queryRaw<Transactions[]>`
      SELECT * FROM "transactions"
      WHERE
          "sentAt" IS NOT NULL
          AND "minedAt" IS NULL
          AND "cancelledAt" IS NULL
          AND "errorMessage" IS NULL
      ORDER BY "nonce" ASC
      LIMIT ${config.maxTxsToUpdate}
      FOR UPDATE SKIP LOCKED`;
};

const getQueuedPostgresTransactions = async (
  pgtx: PrismaTransaction,
): Promise<Transactions[]> => {
  const config = await getConfig();
  const prisma = getPrismaWithPostgresTx(pgtx);

  return await prisma.$queryRaw<Transactions[]>`
    SELECT * FROM "transactions"
    WHERE
        "sentAt" IS NULL
        AND "minedAt" IS NULL
        AND "cancelledAt" IS NULL
        AND "errorMessage" IS NULL
    ORDER BY "queuedAt" ASC
    LIMIT ${config.maxTxsToProcess}
    FOR UPDATE SKIP LOCKED`;
};

const toSentTransaction = (row: Transactions): SentTransaction => {
  assert(row.sentAt);
  assert(row.sentAtBlockNumber);
  const queuedTransaction = toQueuedTransaction(row);

  if (queuedTransaction.isUserOp) {
    assert(row.userOpHash);
    return {
      ...queuedTransaction,
      status: "sent",
      isUserOp: true,
      sentAt: row.sentAt,
      sentAtBlock: BigInt(row.sentAtBlockNumber),
      nonce: "", // unused
      userOpHash: row.userOpHash as Hex,
    };
  }

  assert(row.transactionHash);
  assert(row.nonce);
  return {
    ...queuedTransaction,
    status: "sent",
    isUserOp: false,
    sentAt: row.sentAt,
    sentAtBlock: BigInt(row.sentAtBlockNumber),
    nonce: row.nonce,
    sentTransactionHashes: [row.transactionHash as Hex],
  };
};

const toQueuedTransaction = (row: Transactions): QueuedTransaction => {
  assert(row.fromAddress);
  assert(row.data);

  return {
    status: "queued",
    queueId: row.idempotencyKey,
    queuedAt: row.queuedAt,
    resendCount: 0,

    isUserOp: !!row.accountAddress,
    chainId: parseInt(row.chainId),
    from: normalizeAddress(row.fromAddress),
    to: normalizeAddress(row.toAddress),
    value: row.value ? BigInt(row.value) : 0n,

    data: row.data as Hex,
    functionName: row.functionName ?? undefined,
    functionArgs: row.functionArgs?.split(","),

    gas: maybeBigInt(row.gasLimit ?? undefined),
    gasPrice: maybeBigInt(row.gasPrice ?? undefined),
    maxFeePerGas: maybeBigInt(row.maxFeePerGas ?? undefined),
    maxPriorityFeePerGas: maybeBigInt(row.maxPriorityFeePerGas ?? undefined),

    // Offchain metadata
    deployedContractAddress: normalizeAddress(row.deployedContractAddress),
    deployedContractType: row.deployedContractType ?? undefined,
    extension: row.extension ?? undefined,

    // User Operation
    signerAddress: normalizeAddress(row.signerAddress),
    accountAddress: normalizeAddress(row.accountAddress),
    target: normalizeAddress(row.target),
    sender: normalizeAddress(row.sender),
  };
};
