import { Hono } from "hono";
import { isRedisReachable } from "../../lib/redis";
import { env } from "../../lib/env";
import { thirdwebClientId } from "../../lib/thirdweb-client";
import { getConfigInDb } from "../../lib/config";

export const healthCheckRoute = new Hono();

healthCheckRoute.get("/", async (c) => {
  const redis = await isRedisReachable();
  const auth = await isAuthValid();
  const db = await isDatabaseReachable();

  const isHealthy = db && redis && auth;

  return c.json(
    {
      db,
      redis,
      auth,
      engineVersion: env.ENGINE_VERSION,
      engineTier: env.ENGINE_TIER ?? "SELF_HOSTED",
      clientId: thirdwebClientId,
    },
    isHealthy ? 200 : 503,
  );
});

async function isAuthValid() {
  try {
    const resp = await fetch("https://api.thirdweb.com/v2/keys/use", {
      headers: {
        "x-secret-key": env.THIRDWEB_API_SECRET_KEY,
      },
    });
    return resp.ok;
  } catch {
    return false;
  }
}

async function isDatabaseReachable() {
  const response = await getConfigInDb();
  return response.isOk();
}
