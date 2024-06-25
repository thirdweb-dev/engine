import { Queue } from "bullmq";
import superjson from "superjson";
import { Hex } from "viem";
import { InsertedTransaction } from "../../db/transactions/insertTransaction";
import { redis } from "../../utils/redis/redis";
import { defaultJobOptions } from "./queues";

export const PREPARE_TRANSACTION_QUEUE_NAME = "prepare-transaction";

// Queue
const _queue = new Queue<string>(PREPARE_TRANSACTION_QUEUE_NAME, {
  connection: redis,
  defaultJobOptions,
});

// QueuedTransaction is a raw transaction from the caller.
// The transaction is not validated or prepared yet.
export type QueuedTransaction = InsertedTransaction & {
  // Offchain metadata
  queueId: string;
  idempotencyKey: string;
  queuedAt: Date;

  // Populated
  data: Hex;
  value: bigint;
};

export type PrepareTransactionData = {
  queuedTransaction: QueuedTransaction;
};

export const enqueuePrepareTransaction = async (
  data: PrepareTransactionData,
) => {
  const serialized = superjson.stringify(data);
  await _queue.add(data.queuedTransaction.queueId, serialized, {
    // Don't enqueue more than one job per `idempotencyKey`.
    // This key is intended to prevent duplicate sends.
    jobId: data.queuedTransaction.idempotencyKey,
  });
};
