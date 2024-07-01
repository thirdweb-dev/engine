import superjson from "superjson";
import { redis } from "../../utils/redis/redis";
import { AnyTransaction } from "../../utils/transaction/types";

export class TransactionDB {
  private static STORAGE_TTL_SECONDS = 2 * 24 * 60 * 60; // 2 days

  private static key = (queueId: string) => `transaction-db:${queueId}`;

  // /**
  //  * Inserts a new transaction.
  //  * @param transaction
  //  * @throws if the key already exists.
  //  */
  // static createIfNotExists = async (transaction: AnyTransaction) => {
  //   const key = this.key(transaction.queueId);
  //   const ok = await redis.set(
  //     key,
  //     superjson.stringify(transaction),
  //     "EX",
  //     this.STORAGE_TTL_SECONDS,
  //     "NX",
  //   );
  //   if (!ok) {
  //     throw new Error(`Key already exists: ${key}`);
  //   }
  // };

  // /**
  //  * Updates an existing transaction.
  //  * @param transaction
  //  * @throws if the key doesn't exist.
  //  */
  // static update = async (transaction: AnyTransaction) => {
  //   const key = this.key(transaction.queueId);
  //   const ok = await redis.set(
  //     key,
  //     superjson.stringify(transaction),
  //     "KEEPTTL",
  //     "XX",
  //   );
  //   if (!ok) {
  //     throw new Error(`Key does not exist: ${key}`);
  //   }
  // };

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
