import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { FastifyAdapter } from "@bull-board/fastify";
import { Queue } from "bullmq";
import { FastifyInstance } from "fastify";
import { CancelRecycledNoncesQueue } from "../../worker/queues/cancelRecycledNoncesQueue";
import { MineTransactionQueue } from "../../worker/queues/mineTransactionQueue";
import { ProcessEventsLogQueue } from "../../worker/queues/processEventLogsQueue";
import { ProcessTransactionReceiptsQueue } from "../../worker/queues/processTransactionReceiptsQueue";
import { PruneTransactionsQueue } from "../../worker/queues/pruneTransactionsQueue";
import { SendTransactionQueue } from "../../worker/queues/sendTransactionQueue";
import { SendWebhookQueue } from "../../worker/queues/sendWebhookQueue";

export const withAdminRoutes = async (server: FastifyInstance) => {
  const serverAdapter = new FastifyAdapter();

  const queues: Queue[] = [
    SendWebhookQueue.q,
    ProcessEventsLogQueue.q,
    ProcessTransactionReceiptsQueue.q,
    SendTransactionQueue.q,
    MineTransactionQueue.q,
    CancelRecycledNoncesQueue.q,
    PruneTransactionsQueue.q,
  ];

  createBullBoard({
    queues: queues.map((q) => new BullMQAdapter(q)),
    serverAdapter,
  });

  const bullboardPath = "/admin/queues";

  serverAdapter.setBasePath(bullboardPath);
  await server.register(serverAdapter.registerPlugin(), {
    basePath: bullboardPath,
    prefix: bullboardPath,
  });
};
