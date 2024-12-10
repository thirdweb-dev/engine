import { logger } from "../shared/utils/logger";
import {
  acquireLock,
  releaseLock,
  waitForLock,
} from "../shared/utils/redis/lock";
import { redis } from "../shared/utils/redis/redis";

const MIGRATION_LOCK_TTL_SECONDS = 60;

const main = async () => {
  // Acquire a lock to allow only one host to run migrations.
  // Other hosts block until the migration is completed or lock times out.
  const acquiredLock = await acquireLock(
    "lock:apply-migrations",
    MIGRATION_LOCK_TTL_SECONDS,
  );
  if (!acquiredLock) {
    logger({
      level: "info",
      message: "Migration in progress. Waiting for the lock to release...",
      service: "server",
    });
    await waitForLock("lock:apply-migrations");
    process.exit(0);
  }

  try {
    await migrateRecycledNonces();

    logger({
      level: "info",
      message: "Completed migrations successfully.",
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
    await releaseLock("lock:apply-migrations");
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
