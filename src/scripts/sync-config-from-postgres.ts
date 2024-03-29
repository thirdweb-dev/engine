import { createHash } from "crypto";
import { env } from "../utils/env";

// const engineConfigCacheKey = "engineConfig";

// export const initSyncConfigFromPostgres = async () => {
//   logger({
//     level: "info",
//     message: "Syncing config from Postgres to Redis",
//     service: "cache",
//   });
//   // Postgres DB Data
//   const config = await getConfig();
//   let engineConfigCacheData = await redis.get(engineConfigCacheKey);

//   if (!engineConfigCacheData) {
//     await redis.set(engineConfigCacheKey, JSON.stringify(config));
//     engineConfigCacheData = JSON.stringify(config);
//     return;
//   }

//   const isConfigDataChanged = compareData(
//     config,
//     JSON.parse(engineConfigCacheData),
//   );

//   if (isConfigDataChanged) {
//     await redis.set(engineConfigCacheKey, JSON.stringify(config));
//   }
// };

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
    return true;
  }
  return false;
};
