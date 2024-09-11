import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { env } from "../../utils/env";
import { recordMetrics } from "../../utils/prometheus";

export const withPrometheus = async (server: FastifyInstance) => {
  if (!env.METRICS_ENABLED) {
    return;
  }

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
};
