import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { recordMetrics } from "../../utils/prometheus";

export const withPrometheus = async (server: FastifyInstance) => {
  server.addHook(
    "onResponse",
    async (req: FastifyRequest, res: FastifyReply) => {
      const { method, url, ip, routeOptions } = req;
      const { statusCode } = res;
      const duration = res.elapsedTime; // Use Fastify's built-in timing

      // Record metrics
      recordMetrics({
        event: "response_sent",
        params: {
          endpoint: new URL(url).pathname,
          statusCode,
          duration: duration / 1000, // Convert to seconds for Prometheus
        },
      });
    },
  );
};
