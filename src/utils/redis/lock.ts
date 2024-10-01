import { redis } from "./redis";

/**
 * Acquire a lock to prevent duplicate runs of a workflow.
 *
 * @param key string The lock identifier.
 * @param ttlSeconds number The number of seconds before the lock is automatically released.
 * @returns true if the lock was acquired. Else false.
 */
export const acquireLock = async (
  key: string,
  ttlSeconds: number,
): Promise<boolean> => {
  const result = await redis.set(
    `lock:${key}`,
    Date.now(),
    "EX",
    ttlSeconds,
    "NX",
  );
  return result === "OK";
};

/**
 * Release a lock.
 *
 * @param key The lock identifier.
 * @returns true if the lock was active before releasing.
 */
export const releaseLock = async (key: string) => {
  const result = await redis.del(`lock:${key}`);
  return result > 0;
};
