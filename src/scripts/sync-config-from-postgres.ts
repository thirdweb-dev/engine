import { createHash } from "crypto";
import { getRedisClient } from "../db/client";
import { getAllWebhooks } from "../db/webhooks/getAllWebhooks";
import { getConfig } from "../utils/cache/getConfig";
import { env } from "../utils/env";
import { logger } from "../utils/logger";

const engineConfigCacheKey = "engineConfig";
const engineWebhookCacheKey = "engineWebhooks";

export const initSyncConfigFromPostgres = async () => {
  logger({
    level: "info",
    message: "Syncing config from Postgres to Redis",
    service: "cache",
  });
  const redisClient = await getRedisClient();

  // Postgres DB Data
  const config = await getConfig();
  const webhooks = await getAllWebhooks();

  let engineConfigCacheData = await redisClient.get(engineConfigCacheKey);
  let engineWebhookCacheData = await redisClient.get(engineWebhookCacheKey);

  if (!engineConfigCacheData || !engineWebhookCacheData) {
    await redisClient.set(engineConfigCacheKey, JSON.stringify(config));
    await redisClient.set(engineWebhookCacheKey, JSON.stringify(webhooks));
    engineConfigCacheData = JSON.stringify(config);
    engineWebhookCacheData = JSON.stringify(webhooks);
    return;
  }

  const isConfigDataChanged = compareData(
    config,
    JSON.parse(engineConfigCacheData),
  );
  const isWebhookDataChanged = compareData(
    webhooks,
    JSON.parse(engineWebhookCacheData),
  );

  if (isConfigDataChanged) {
    await redisClient.set(engineConfigCacheKey, JSON.stringify(config));
  }

  if (isWebhookDataChanged) {
    await redisClient.set(engineWebhookCacheKey, JSON.stringify(webhooks));
  }
};

// Function to generate a hash of your config data
const hashData = (data: string, salt: string): string => {
  return createHash("sha256")
    .update(data + salt)
    .digest("hex");
};

const compareData = (dataA: object, dataB: object): boolean => {
  const redisCacheHash = hashData(
    JSON.stringify(dataA),
    env.THIRDWEB_API_SECRET_KEY,
  );

  const dbCacheHash = hashData(
    JSON.stringify(dataB),
    env.THIRDWEB_API_SECRET_KEY,
  );

  if (redisCacheHash !== dbCacheHash) {
    return false;
  }
  return true;
};
