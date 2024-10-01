import { logger } from "../utils/logger";
import { acquireLock, releaseLock } from "../utils/redis/lock";
import { redis } from "../utils/redis/redis";

const MIGRATION_LOCK_KEY = "apply-migrations";
const MIGRATION_LOCK_TTL_SECONDS = 60;

const main = async () => {
  // Acquire a lock to prevent duplicate migrations if there are
  // multiple running server instances.
  const acquiredLock = await acquireLock(
    MIGRATION_LOCK_KEY,
    MIGRATION_LOCK_TTL_SECONDS,
  );
  if (!acquiredLock) {
    return;
  }

  try {
    await migrateRecycledNonces();

    logger({
      level: "info",
      message: "Completed migrations without errors.",
      service: "server",
    });
  } catch (e) {
    logger({
      level: "error",
      message: `Failed to complete migrations: ${e}`,
      service: "server",
    });
    process.exit(1);
  } finally {
    await releaseLock(MIGRATION_LOCK_KEY);
  }

  process.exit(0);
};

const migrateRecycledNonces = async () => {
  const keys = await redis.keys("nonce-recycled:*");

  // For each `nonce-recycled:*` key that is a "set" in Redis,
  // migrate all members to a sorted set with score == nonce.
  for (const key of keys) {
    const type = await redis.type(key);
    if (type !== "set") {
      continue;
    }

    const members = await redis.smembers(key);
    await redis.del(key);
    if (members.length > 0) {
      const args = members.flatMap((member) => {
        const score = Number.parseInt(member);
        return Number.isNaN(score) ? [] : [score, member];
      });
      await redis.zadd(key, ...args);
    }
  }
};

main();
