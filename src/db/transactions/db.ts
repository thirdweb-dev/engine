import superjson from "superjson";
import { redis } from "../../utils/redis/redis";
import { AnyTransaction } from "../../utils/transaction/types";

export class TransactionDB {
  private static STORAGE_TTL_SECONDS = 2 * 24 * 60 * 60; // 2 days

  private static key = (queueId: string) => `transaction-db:${queueId}`;

  /**
   * Inserts or replaces a transaction.
   * @param transaction
   */
  static set = async (transaction: AnyTransaction) => {
    await redis.setex(
      this.key(transaction.queueId),
      superjson.stringify(transaction),
      this.STORAGE_TTL_SECONDS,
    );
  };

  /**
   * Gets a transaction by queueId.
   * @param queueId
   * @returns transaction, or null if not found.
   */
  static get = async (queueId: string): Promise<AnyTransaction | null> => {
    const val = await redis.get(this.key(queueId));
    return val ? superjson.parse(val) : null;
  };

  /**
   * Check if a transaction exists.
   * @param queueId
   * @returns true if the transaction exists, else false.
   */
  static exists = async (queueId: string): Promise<boolean> =>
    (await redis.exists(this.key(queueId))) > 0;
}
