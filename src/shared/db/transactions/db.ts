import superjson from "superjson";
import { MAX_REDIS_BATCH_SIZE, redis } from "../../utils/redis/redis";
import type { AnyTransaction } from "../../utils/transaction/types";

/**
 * Backfill entry stored as JSON in Redis.
 * Used for transaction status and logs fallback lookup.
 */
export interface BackfillEntry {
  status: "mined" | "errored";
  transactionHash?: string; // Only present for mined transactions
}

/**
 * Schemas
 *
 * Transaction details
 * key: `transaction:<queueId>`
 * value: JSON
 *
 * Queued transactions
 * key: `transactions:queued`
 * score: timestamp in unix seconds
 * member: queueId
 *
 * Mined transactions
 * key: `transactions:mined`
 * score: timestamp in unix seconds
 * member: queueId
 *
 * Cancelled transactions
 * key: `transactions:cancelled`
 * score: timestamp in unix seconds
 * member: queueId
 *
 * Errored transactions
 * key: `transactions:errored`
 * score: timestamp in unix seconds
 * member: queueId
 */

export class TransactionDB {
  private static transactionDetailsKey = (queueId: string) =>
    `transaction:${queueId}`;
  private static queuedTransactionsKey = "transaction:queued";
  private static minedTransactionsKey = "transaction:mined";
  private static cancelledTransactionsKey = "transaction:cancelled";
  private static erroredTransactionsKey = "transaction:errored";
  private static backfillKey = (queueId: string) => `backfill:${queueId}`;

  /**
   * Inserts or replaces a transaction details.
   * Also adds to the appropriate "status" sorted set.
   * @param transaction
   */
  static set = async (transaction: AnyTransaction) => {
    const pipeline = redis
      .pipeline()
      .set(
        this.transactionDetailsKey(transaction.queueId),
        superjson.stringify(transaction),
      );

    switch (transaction.status) {
      case "queued":
        pipeline.zadd(
          this.queuedTransactionsKey,
          toSeconds(transaction.queuedAt),
          transaction.queueId,
        );
        break;

      case "mined":
        pipeline.zadd(
          this.minedTransactionsKey,
          toSeconds(transaction.minedAt),
          transaction.queueId,
        );
        break;

      case "cancelled":
        pipeline.zadd(
          this.cancelledTransactionsKey,
          toSeconds(transaction.cancelledAt),
          transaction.queueId,
        );
        break;

      case "errored":
        pipeline.zadd(
          this.erroredTransactionsKey,
          toSeconds(new Date()),
          transaction.queueId,
        );
        break;
    }

    await pipeline.exec();
  };

  /**
   * Gets transaction details by queueId.
   * @param queueId
   * @returns AnyTransaction, or null if not found.
   */
  static get = async (queueId: string): Promise<AnyTransaction | null> => {
    const val = await redis.get(this.transactionDetailsKey(queueId));
    return val ? superjson.parse(val) : null;
  };

  /**
   * Gets multiple transaction details by a list of queueIds.
   * Skips any queueIds that aren't found.
   * @param queueIds
   * @returns AnyTransaction[]
   */
  static bulkGet = async (queueIds: string[]): Promise<AnyTransaction[]> => {
    if (queueIds.length === 0) {
      return [];
    }

    const result: AnyTransaction[] = [];
    for (let i = 0; i < queueIds.length; i += MAX_REDIS_BATCH_SIZE) {
      const keys = queueIds
        .slice(i, i + MAX_REDIS_BATCH_SIZE)
        .map(this.transactionDetailsKey);
      const vals = await redis.mget(...keys);

      for (const val of vals) {
        if (val) {
          result.push(superjson.parse(val));
        }
      }
    }
    return result;
  };

  /**
   * Deletes multiple transaction details by a list of queueIds.
   * @param queueIds
   * @returns number - The number of transaction details deleted.
   */
  static bulkDelete = async (queueIds: string[]) => {
    if (queueIds.length === 0) {
      return 0;
    }

    let numDeleted = 0;
    for (let i = 0; i < queueIds.length; i += MAX_REDIS_BATCH_SIZE) {
      const keys = queueIds
        .slice(i, i + MAX_REDIS_BATCH_SIZE)
        .map(this.transactionDetailsKey);
      numDeleted += await redis.unlink(...keys);
    }
    return numDeleted;
  };

  /**
   * Check if a transaction exists.
   * @param queueId
   * @returns true if the transaction exists, else false.
   */
  static exists = async (queueId: string): Promise<boolean> =>
    (await redis.exists(this.transactionDetailsKey(queueId))) > 0;

  /**
   * Lists all transaction details by status.
   * Returns results paginated in descending order.
   * @param status "queued" | "mined" | "cancelled" | "errored"
   * @param page
   * @param limit
   * @returns
   */
  static getTransactionListByStatus = async (args: {
    status: "queued" | "mined" | "cancelled" | "errored";
    page: number;
    limit: number;
  }): Promise<{ transactions: AnyTransaction[]; totalCount: number }> => {
    const { status, page, limit } = args;
    const start = (page - 1) * limit;
    const end = start + limit - 1;

    const key =
      status === "mined"
        ? this.minedTransactionsKey
        : status === "cancelled"
          ? this.cancelledTransactionsKey
          : status === "errored"
            ? this.erroredTransactionsKey
            : this.queuedTransactionsKey;

    const queueIds = await redis.zrevrange(key, start, end);
    const transactions = await this.bulkGet(queueIds);
    const totalCount = await redis.zcard(key);

    return { transactions, totalCount };
  };

  /**
   * Prunes transaction details and lists, keeping the latest `keep` amount/
   * @param keep number - The max recent transactions to not prune.
   * @returns number - The number of transactions pruned.
   */
  static pruneTransactionDetailsAndLists = async (keep: number) => {
    // Delete up to `keep - 1` index, inclusive.
    const stop = -keep - 1;

    const queueIds = await redis.zrange(this.queuedTransactionsKey, 0, stop);
    const numPruned = await this.bulkDelete(queueIds);

    await redis
      .pipeline()
      .zremrangebyrank(this.queuedTransactionsKey, 0, stop)
      .zremrangebyrank(this.minedTransactionsKey, 0, stop)
      .zremrangebyrank(this.cancelledTransactionsKey, 0, stop)
      .zremrangebyrank(this.erroredTransactionsKey, 0, stop)
      .exec();

    return numPruned;
  };

  /**
   * Gets backfill entry from backfill table.
   * Returns parsed JSON or handles backwards compatibility for plain string tx hashes.
   */
  static getBackfill = async (queueId: string): Promise<BackfillEntry | null> => {
    const val = await redis.get(this.backfillKey(queueId));
    if (!val) return null;
    try {
      return JSON.parse(val) as BackfillEntry;
    } catch {
      // Backwards compatibility: treat plain string as mined tx hash
      return { status: "mined", transactionHash: val };
    }
  };

  /**
   * @deprecated Use getBackfill instead
   * Gets transaction hash from backfill table.
   */
  static getBackfillHash = async (queueId: string): Promise<string | null> => {
    const backfill = await this.getBackfill(queueId);
    if (backfill?.status === "mined" && backfill.transactionHash) {
      return backfill.transactionHash;
    }
    return null;
  };

  /**
   * Sets a backfill entry. Uses SETNX to never overwrite.
   * @returns true if set, false if already exists
   */
  static setBackfill = async (
    queueId: string,
    transactionHash: string,
  ): Promise<boolean> => {
    const entry: BackfillEntry = { status: "mined", transactionHash };
    const result = await redis.setnx(
      this.backfillKey(queueId),
      JSON.stringify(entry),
    );
    return result === 1;
  };

  /**
   * Bulk set backfill entries.
   * @returns { inserted: number, skipped: number }
   */
  static bulkSetBackfill = async (
    entries: Array<{ queueId: string; status: "mined" | "errored"; transactionHash?: string }>,
  ): Promise<{ inserted: number; skipped: number }> => {
    let inserted = 0;
    let skipped = 0;

    const pipeline = redis.pipeline();
    for (const { queueId, status, transactionHash } of entries) {
      const entry: BackfillEntry = { status, transactionHash };
      pipeline.setnx(this.backfillKey(queueId), JSON.stringify(entry));
    }

    const results = await pipeline.exec();
    for (const [err, result] of results ?? []) {
      if (!err && result === 1) {
        inserted++;
      } else {
        skipped++;
      }
    }

    return { inserted, skipped };
  };

  /**
   * Clears all backfill entries.
   * @returns number - The number of entries deleted.
   */
  static clearBackfill = async (): Promise<number> => {
    let totalDeleted = 0;
    let cursor = "0";

    do {
      const [nextCursor, keys] = await redis.scan(
        cursor,
        "MATCH",
        "backfill:*",
        "COUNT",
        1000,
      );
      cursor = nextCursor;

      if (keys.length > 0) {
        const deleted = await redis.unlink(...keys);
        totalDeleted += deleted;
      }
    } while (cursor !== "0");

    return totalDeleted;
  };
}

const toSeconds = (timestamp: Date) => timestamp.getTime() / 1000;
