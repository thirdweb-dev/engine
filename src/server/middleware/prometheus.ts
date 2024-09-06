import fastify, {
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
} from "fastify";
import { env } from "../../utils/env";
import { enginePromRegister, recordMetrics } from "../../utils/prometheus";

export const withPrometheus = async (server: FastifyInstance) => {
  if (!env.METRICS_ENABLED) {
    console.log("Metrics are disabled");
    return;
  }

  console.log("Metrics are enabled");
  server.addHook(
    "onResponse",
    (req: FastifyRequest, res: FastifyReply, done) => {
      const { method } = req;
      const url = req.routeOptions.url;
      const { statusCode } = res;
      const duration = res.elapsedTime; // Use Fastify's built-in timing

      // Record metrics
      recordMetrics({
        event: "response_sent",
        params: {
          endpoint: url ?? "",
          statusCode: statusCode.toString(),
          duration: duration,
          method: method,
        },
      });

      done();
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
