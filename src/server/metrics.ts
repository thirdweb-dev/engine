import { Hono } from "hono";
import { enginePromRegister } from "../lib/prometheus";
import { env } from "../lib/env";
import { initializeLogger } from "../lib/logger";

const metricsLogger = initializeLogger("metrics");
const metricsServer = new Hono();

metricsServer.get("/metrics", async (c) => {
  const metrics = await enginePromRegister.metrics();
  c.header("Content-Type", enginePromRegister.contentType);
  return c.body(metrics);
});

const tls = env.ENABLE_HTTPS
  ? {
      key: Bun.file("../https/key.pem"),
      cert: Bun.file("../https/cert.pem"),
      passphrase: env.HTTPS_PASSPHRASE,
    }
  : {};

if (env.METRICS_ENABLED) {
  Bun.serve({
    port: env.METRICS_PORT,
    tls: {
      ...tls,
      passphrase: env.HTTPS_PASSPHRASE,
    },
    fetch: metricsServer.fetch,
  });
}

metricsLogger.info(`Metrics server is listening on port ${env.METRICS_PORT}`);
