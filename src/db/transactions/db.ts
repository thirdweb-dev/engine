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
   * Deletes multiple transaction details by a list of queueIds.
   * @param queueIds
   * @returns number - The number of transaction details deleted.
   */
  static bulkDelete = async (queueIds: string[]) => {
    if (queueIds.length === 0) {
      return 0;
    }

    const keys = queueIds.map(this.transactionDetailsKey);
    return await redis.unlink(...keys);
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
}

const toSeconds = (timestamp: Date) => timestamp.getTime() / 1000;
