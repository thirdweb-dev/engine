import superjson from "superjson";
import { redis } from "../../utils/redis/redis";
import { AnyTransaction } from "../../utils/transaction/types";

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
  private static queuedTransactionsKey = `transaction:queued`;
  private static minedTransactionsKey = `transaction:mined`;
  private static cancelledTransactionsKey = `transaction:cancelled`;
  private static erroredTransactionsKey = `transaction:errored`;

  static COMPLETED_TRANSACTIONS_MAX_AGE_SECONDS = 2 * 24 * 60 * 60; // 2 days

  /**
   * Inserts or replaces a transaction details.
   * Also adds to the appropriate "status" sorted set.
   * Sets a TTL for completed statuses (mined, cancelled, errored).
   *
   * @param transaction
   */
  static set = async (transaction: AnyTransaction) => {
    switch (transaction.status) {
      case "queued":
        return redis
          .pipeline()
          .set(
            this.transactionDetailsKey(transaction.queueId),
            superjson.stringify(transaction),
          )
          .zadd(
            this.queuedTransactionsKey,
            toSeconds(transaction.queuedAt),
            transaction.queueId,
          )
          .exec();

      case "mined":
        return redis
          .pipeline()
          .setex(
            this.transactionDetailsKey(transaction.queueId),
            this.COMPLETED_TRANSACTIONS_MAX_AGE_SECONDS,
            superjson.stringify(transaction),
          )
          .zadd(
            this.minedTransactionsKey,
            toSeconds(transaction.minedAt),
            transaction.queueId,
          )
          .exec();

      case "cancelled":
        return redis
          .pipeline()
          .setex(
            this.transactionDetailsKey(transaction.queueId),
            this.COMPLETED_TRANSACTIONS_MAX_AGE_SECONDS,
            superjson.stringify(transaction),
          )
          .zadd(
            this.cancelledTransactionsKey,
            toSeconds(transaction.cancelledAt),
            transaction.queueId,
          )
          .exec();

      case "errored":
        return redis
          .pipeline()
          .setex(
            this.transactionDetailsKey(transaction.queueId),
            this.COMPLETED_TRANSACTIONS_MAX_AGE_SECONDS,
            superjson.stringify(transaction),
          )
          .zadd(
            this.erroredTransactionsKey,
            toSeconds(new Date()),
            transaction.queueId,
          )
          .exec();
    }
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

    const keys = queueIds.map(this.transactionDetailsKey);
    const vals = await redis.mget(...keys);

    const result: AnyTransaction[] = [];
    for (const val of vals) {
      if (val) {
        result.push(superjson.parse(val));
      }
    }
    return result;
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
   * @param status "queued" | "mined" | "cancelled" | "errored"
   * @param page
   * @param limit
   * @returns
   */
  static listByStatus = async (args: {
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
   * Deletes transactions between a time range.
   * @param from Date?
   * @param to Date?
   * @returns string[] List of queueIds
   */
  static purgeTransactions = async (args: { from?: Date; to?: Date }) => {
    const { from, to } = args;
    const min = from ? toSeconds(from) : 0;
    const max = to ? toSeconds(to) : "+inf";

    // Delete per-status sorted sets. Do not purge queued transactions.
    await redis
      .pipeline()
      .zremrangebyscore(this.minedTransactionsKey, min, max)
      .zremrangebyscore(this.cancelledTransactionsKey, min, max)
      .zremrangebyscore(this.erroredTransactionsKey, min, max)
      .exec();
  };
}

const toSeconds = (timestamp: Date) => timestamp.getTime() / 1000;
