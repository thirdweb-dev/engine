import fastify, {
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
} from "fastify";
import { env } from "../../utils/env";
import { enginePromRegister, recordMetrics } from "../../utils/prometheus";

export const withPrometheus = async (server: FastifyInstance) => {
  if (!env.METRICS_ENABLED) {
    return;
  }

  server.addHook(
    "onResponse",
    async (req: FastifyRequest, res: FastifyReply) => {
      const { method, url } = req;
      const { statusCode } = res;
      const duration = res.elapsedTime; // Use Fastify's built-in timing

      // Record metrics
      recordMetrics({
        event: "response_sent",
        params: {
          endpoint: new URL(url).pathname,
          statusCode: statusCode.toString(),
          duration: duration,
          method: method,
        },
      });
    },
  );
  // Expose metrics endpoint

  const metricsServer = fastify({
    disableRequestLogging: true,
  });

  metricsServer.get("/metrics", async (request, reply) => {
    reply.header("Content-Type", enginePromRegister.contentType);
    return enginePromRegister.metrics();
  });

  await metricsServer.ready();
  metricsServer.listen({
    host: env.METRICS_HOST ?? env.HOST,
    port: env.METRICS_PORT,
  });
};
