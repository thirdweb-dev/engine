import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { env } from "../../utils/env";
import { recordMetrics } from "../../utils/prometheus";

export function withPrometheus(server: FastifyInstance) {
  if (!env.METRICS_ENABLED) {
    return;
  }

  server.addHook(
    "onResponse",
    async (req: FastifyRequest, res: FastifyReply) => {
      const { method } = req;
      const url = req.routeOptions.url;
      const { statusCode } = res;
      const duration = res.elapsedTime;

      recordMetrics({
        event: "response_sent",
        params: {
          endpoint: url ?? "",
          statusCode: statusCode.toString(),
          duration: duration,
          method: method,
        },
      });
    },
  );
}
