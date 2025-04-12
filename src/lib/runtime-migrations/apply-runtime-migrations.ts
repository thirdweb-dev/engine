import { initializeLogger } from "../logger.js";
import { acquireLock, releaseLock, waitForLock } from "../redis.js";

const logger = initializeLogger("runtime-migrations");

const MIGRATION_LOCK_TTL_SECONDS = 60;
const LOCK_KEY = "lock:apply-migrations";

export async function applyRuntimeMigrations() {
  // Acquire a lock to allow only one host to run migrations.
  // Other hosts block until the migration is completed or lock times out.
  const acquiredLock = await acquireLock(LOCK_KEY, MIGRATION_LOCK_TTL_SECONDS);
  if (!acquiredLock) {
    logger.info("Migration in progress. Waiting for the lock to release...");
    await waitForLock(LOCK_KEY);
    process.exit(0);
  }

  try {
    // run all migrations here
    logger.info("Completed migrations successfully.");
  } catch (e) {
    logger.error(`Failed to complete migrations: ${e}`);
    process.exit(1);
  } finally {
    await releaseLock(LOCK_KEY);
  }

  process.exit(0);
}
