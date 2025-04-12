import { Redis } from "ioredis";
import { env } from "./env.js";
import { initializeLogger } from "./logger.js";

const redisLogger = initializeLogger("redis");

// ioredis has issues with batches over 100k+ (source: https://github.com/redis/ioredis/issues/801).
export const MAX_REDIS_BATCH_SIZE = 50_000;

export const redis = new Redis(env.REDIS_URL, {
  enableAutoPipelining: true,
  maxRetriesPerRequest: null,
});

try {
  await redis.config("SET", "maxmemory", env.REDIS_MAXMEMORY);
} catch (error) {
  redisLogger.error("Initializing Redis", error);
}

redis.on("error", (error) => () => {
  redisLogger.error("Redis error", error);
});
redis.on("ready", () => {
  redisLogger.info("Redis ready");
});

// Assuming logger setup is similar
const lockLogger = initializeLogger("redis-lock-utils");

// --- Type-Safe Lock Utilities ---

/**
 * Attempts to acquire a distributed lock using Redis.
 *
 * @param client - The ioredis client instance.
 * @param key - The unique key for the lock.
 * @param ttlSeconds - The time-to-live for the lock in seconds.
 *                     The lock will automatically expire after this duration
 *                     if not released explicitly.
 * @returns A promise that resolves to `true` if the lock was acquired
 *          successfully, and `false` otherwise (e.g., lock already held).
 */
export async function acquireLock(
  key: string,
  ttlSeconds: number,
): Promise<boolean> {
  try {
    // SET key value EX ttlSeconds NX
    // EX: Set the specified expire time, in seconds.
    // NX: Only set the key if it does not already exist.
    // 'OK' is returned if the operation is successful (lock acquired).
    // null is returned if the key already exists (lock not acquired).
    const result = await redis.set(key, "locked", "EX", ttlSeconds, "NX");
    const acquired = result === "OK";
    if (acquired) {
      lockLogger.debug(`Lock acquired successfully for key: ${key}`);
    } else {
      lockLogger.debug(`Failed to acquire lock (already held): ${key}`);
    }
    return acquired;
  } catch (error) {
    lockLogger.error(`Error acquiring lock for key ${key}: ${error}`);
    return false; // Assume lock not acquired on error
  }
}

/**
 * Releases a distributed lock by deleting the key from Redis.
 *
 * @param client - The ioredis client instance.
 * @param key - The unique key for the lock to release.
 * @returns A promise that resolves when the delete command is sent.
 *          It doesn't guarantee the lock was actually held by the caller.
 */
export async function releaseLock(key: string): Promise<void> {
  try {
    // DEL key
    // Returns the number of keys that were removed (0 or 1 in this case).
    const deletedCount = await redis.del(key);
    if (deletedCount > 0) {
      lockLogger.debug(`Lock released successfully for key: ${key}`);
    } else {
      // This might happen if the lock expired before release, which is fine.
      lockLogger.debug(
        `Lock key not found during release (already expired?): ${key}`,
      );
    }
  } catch (error) {
    lockLogger.error(`Error releasing lock for key ${key}: ${error}`);
    // Decide if you want to re-throw or just log based on your error strategy
  }
}

/**
 * Waits until a specific lock key no longer exists in Redis.
 * Polls Redis periodically. Includes a timeout to prevent indefinite waiting.
 *
 * @param client - The ioredis client instance.
 * @param key - The lock key to wait for.
 * @param pollIntervalMs - How often to check for the lock (in milliseconds).
 * @param timeoutMs - Maximum time to wait (in milliseconds).
 * @returns A promise that resolves when the lock key is gone, or rejects on timeout or error.
 */
export function waitForLock(
  key: string,
  pollIntervalMs = 100, // Check every 100ms by default
  timeoutMs = 60000, // Default timeout 60 seconds
): Promise<void> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    const checkLock = async () => {
      try {
        // Check elapsed time
        if (Date.now() - startTime > timeoutMs) {
          return reject(new Error(`Timeout waiting for lock release: ${key}`));
        }

        // EXISTS key
        // Returns 1 if the key exists, 0 otherwise.
        const exists = await redis.exists(key);

        if (exists === 0) {
          lockLogger.debug(`Lock key ${key} released. Proceeding.`);
          resolve(); // Lock is gone
        } else {
          // Lock still exists, wait and check again
          setTimeout(checkLock, pollIntervalMs);
        }
      } catch (error) {
        lockLogger.error(`Error checking lock status for key ${key}: ${error}`);
        reject(error); // Propagate Redis errors
      }
    };

    // Start the first check
    checkLock();
  });
}

export async function isRedisReachable() {
  try {
    await redis.ping();
    return true;
  } catch {
    return false;
  }
}
