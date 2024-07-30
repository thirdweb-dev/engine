import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { FastifyAdapter } from "@bull-board/fastify";
import { FastifyInstance } from "fastify";
import { SendTransactionQueue } from "../../worker/queues/sendTransactionQueue";

export const withAdminRoutes = async (server: FastifyInstance) => {
  const serverAdapter = new FastifyAdapter();

  createBullBoard({
    queues: [new BullMQAdapter(SendTransactionQueue.q)],
    serverAdapter,
  });

  const bullboardPath = "/admin/queues";

  serverAdapter.setBasePath(bullboardPath);
  await server.register(serverAdapter.registerPlugin(), {
    basePath: bullboardPath,
    prefix: bullboardPath,
  });
};
