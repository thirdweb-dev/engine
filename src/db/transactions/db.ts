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
  // private static queuedTransactionsKey = `transaction:queued`;
  private static minedTransactionsKey = `transaction:mined`;
  private static cancelledTransactionsKey = `transaction:cancelled`;
  private static erroredTransactionsKey = `transaction:errored`;

  /**
   * Inserts or replaces a transaction.
   * Updates relevant keys.
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

    await redis.pipeline().exec();
  };

  /**
   * Gets a transaction by queueId.
   * @param queueId
   * @returns transaction, or null if not found.
   */
  static get = async (queueId: string): Promise<AnyTransaction | null> => {
    const val = await redis.get(this.transactionDetailsKey(queueId));
    return val ? superjson.parse(val) : null;
  };

  /**
   * Check if a transaction exists.
   * @param queueId
   * @returns true if the transaction exists, else false.
   */
  static exists = async (queueId: string): Promise<boolean> =>
    (await redis.exists(this.transactionDetailsKey(queueId))) > 0;

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

    const pipeline = redis.pipeline();

    // Delete transaction details.
    const queueIds = await this._getCompletedQueueIds(min, max);
    const transactionDetailsKeys = queueIds.map(this.transactionDetailsKey);
    pipeline.del(...transactionDetailsKeys);

    // Delete per-status sorted sets.
    pipeline.zremrangebyscore(this.minedTransactionsKey, min, max);
    pipeline.zremrangebyscore(this.cancelledTransactionsKey, min, max);
    pipeline.zremrangebyscore(this.erroredTransactionsKey, min, max);

    await pipeline.exec();
  };

  /**
   * Returns completed queue IDs between a start and end timestamp (seconds).
   * @param min number - Start timestamp in seconds
   * @param max number - End timestamp in seconds
   * @returns string[] - List of queueIds
   */
  private static _getCompletedQueueIds = async (
    min: number | string,
    max: number | string,
  ): Promise<string[]> => {
    const pipelineResult = await redis
      .pipeline()
      .zrange(this.minedTransactionsKey, min, max, "BYSCORE")
      .zrange(this.cancelledTransactionsKey, min, max, "BYSCORE")
      .zrange(this.erroredTransactionsKey, min, max, "BYSCORE")
      .exec();

    const queueIds: string[] = [];
    if (pipelineResult) {
      for (const [error, zrangeResult] of pipelineResult) {
        if (error) {
          throw new Error(`TransactionDB.getCompleted: ${error.message}`);
        }
        queueIds.push(...(zrangeResult as string[]));
      }
    }
    return queueIds;
  };
}

const toSeconds = (timestamp: Date) => timestamp.getTime() / 1000;
