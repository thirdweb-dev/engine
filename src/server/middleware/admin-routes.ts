import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter.js";
import { FastifyAdapter } from "@bull-board/fastify";
import type { Queue } from "bullmq";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { timingSafeEqual } from "node:crypto";
import { env } from "../../shared/utils/env.js";
import { CancelRecycledNoncesQueue } from "../../worker/queues/cancel-recycled-nonces-queue.js";
import { MineTransactionQueue } from "../../worker/queues/mine-transaction-queue.js";
import { NonceHealthCheckQueue } from "../../worker/queues/nonce-health-check-queue.js";
import { NonceResyncQueue } from "../../worker/queues/nonce-resync-queue.js";
import { ProcessEventsLogQueue } from "../../worker/queues/process-event-logs-queue.js";
import { ProcessTransactionReceiptsQueue } from "../../worker/queues/process-transaction-receipts-queue.js";
import { PruneTransactionsQueue } from "../../worker/queues/prune-transactions-queue.js";
import { SendTransactionQueue } from "../../worker/queues/send-transaction-queue.js";
import { SendWebhookQueue } from "../../worker/queues/send-webhook-queue.js";

export const ADMIN_QUEUES_BASEPATH = "/admin/queues";
const ADMIN_ROUTES_USERNAME = "admin";
const ADMIN_ROUTES_PASSWORD = env.THIRDWEB_API_SECRET_KEY;

// Add queues to monitor here.
const QUEUES: Queue[] = [
  SendWebhookQueue.q,
  ProcessEventsLogQueue.q,
  ProcessTransactionReceiptsQueue.q,
  SendTransactionQueue.q,
  MineTransactionQueue.q,
  CancelRecycledNoncesQueue.q,
  PruneTransactionsQueue.q,
  NonceResyncQueue.q,
  NonceHealthCheckQueue.q,
];

export const withAdminRoutes = async (fastify: FastifyInstance) => {
  fastify.after(async () => {
    // Create a new route for Bullboard routes.
    const serverAdapter = new FastifyAdapter();
    serverAdapter.setBasePath(ADMIN_QUEUES_BASEPATH);

    createBullBoard({
      queues: QUEUES.map((q) => new BullMQAdapter(q)),
      serverAdapter,
    });

    await fastify.register(serverAdapter.registerPlugin(), {
      basePath: ADMIN_QUEUES_BASEPATH,
      prefix: ADMIN_QUEUES_BASEPATH,
    });

    fastify.addHook("onRequest", async (req, reply) => {
      if (req.url.startsWith(ADMIN_QUEUES_BASEPATH)) {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Basic ")) {
          reply
            .status(StatusCodes.UNAUTHORIZED)
            .header("WWW-Authenticate", 'Basic realm="Admin Routes"')
            .send({ error: "Unauthorized" });
          return;
        }

        // Parse the basic auth credentials (`Basic <base64 of username:password>`).
        const base64Credentials = authHeader.split(" ")[1];
        if (!base64Credentials) {
          reply
            .status(StatusCodes.UNAUTHORIZED)
            .header("WWW-Authenticate", 'Basic realm="Admin Routes"')
            .send({ error: "Unauthorized" });
          return;
        }

        const credentials = Buffer.from(base64Credentials, "base64").toString(
          "utf8",
        );
        const [username, password] = credentials.split(":");
        if (!username || !password) {
          reply
            .status(StatusCodes.UNAUTHORIZED)
            .header("WWW-Authenticate", 'Basic realm="Admin Routes"')
            .send({ error: "Unauthorized" });
          return;
        }

        if (!assertAdminBasicAuth(username, password)) {
          reply
            .status(StatusCodes.UNAUTHORIZED)
            .header("WWW-Authenticate", 'Basic realm="Admin Routes"')
            .send({ error: "Unauthorized" });
          return;
        }
      }
    });
  });
};

const assertAdminBasicAuth = (username: string, password: string) => {
  if (username === ADMIN_ROUTES_USERNAME) {
    try {
      const buf1 = Buffer.from(password.padEnd(100));
      const buf2 = Buffer.from(ADMIN_ROUTES_PASSWORD.padEnd(100));
      return timingSafeEqual(buf1, buf2);
    } catch {}
  }
  return false;
};
