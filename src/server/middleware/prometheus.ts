import { createMiddleware } from "hono/factory";
import { env } from "../../lib/env.js";
import { recordMetrics } from "../../lib/prometheus.js";

export const prometheusMiddleware = createMiddleware(async (c, next) => {
  if (!env.METRICS_ENABLED) {
    await next();
    return;
  }

  const startTime = performance.now();

  await next();

  const duration = performance.now() - startTime;
  const method = c.req.method;
  const url = new URL(c.req.url).pathname;
  const status = c.res.status;

  recordMetrics({
    event: "response_sent",
    params: {
      endpoint: url,
      statusCode: status.toString(),
      duration,
      method,
    },
  });
});
