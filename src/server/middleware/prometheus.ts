import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { register } from "prom-client";
import { recordMetrics } from "../../utils/prometheus";

export const withPrometheus = async (server: FastifyInstance) => {
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
  server.get("/metrics", async (request, reply) => {
    reply.header("Content-Type", register.contentType);
    return register.metrics();
  });
};
