import { redis } from "./redis.js";

// Add more locks here.
type LockType = "lock:apply-migrations";

/**
 * Acquire a lock to prevent duplicate runs of a workflow.
 *
 * @param key string The lock identifier.
 * @param ttlSeconds number The number of seconds before the lock is automatically released.
 * @returns true if the lock was acquired. Else false.
 */
export const acquireLock = async (
  key: LockType,
  ttlSeconds: number,
): Promise<boolean> => {
  const result = await redis.set(key, Date.now(), "EX", ttlSeconds, "NX");
  return result === "OK";
};

/**
 * Release a lock.
 *
 * @param key The lock identifier.
 * @returns true if the lock was active before releasing.
 */
export const releaseLock = async (key: LockType) => {
  const result = await redis.del(key);
  return result > 0;
};

/**
 * Blocking polls a lock every second until it's released.
 *
 * @param key The lock identifier.
 */
export const waitForLock = async (key: LockType) => {
  while (await redis.get(key)) {
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }
};
