import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { FastifyAdapter } from "@bull-board/fastify";
import fastifyBasicAuth from "@fastify/basic-auth";
import type { Queue } from "bullmq";
import { timingSafeEqual } from "crypto";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { env } from "../../utils/env";
import { CancelRecycledNoncesQueue } from "../../worker/queues/cancelRecycledNoncesQueue";
import { MigratePostgresTransactionsQueue } from "../../worker/queues/migratePostgresTransactionsQueue";
import { MineTransactionQueue } from "../../worker/queues/mineTransactionQueue";
import { NonceHealthCheckQueue } from "../../worker/queues/nonceHealthCheckQueue";
import { NonceResyncQueue } from "../../worker/queues/nonceResyncQueue";
import { ProcessEventsLogQueue } from "../../worker/queues/processEventLogsQueue";
import { ProcessTransactionReceiptsQueue } from "../../worker/queues/processTransactionReceiptsQueue";
import { PruneTransactionsQueue } from "../../worker/queues/pruneTransactionsQueue";
import { SendTransactionQueue } from "../../worker/queues/sendTransactionQueue";
import { SendWebhookQueue } from "../../worker/queues/sendWebhookQueue";

export const ADMIN_QUEUES_BASEPATH = "/admin/queues";
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
  MigratePostgresTransactionsQueue.q,
  NonceResyncQueue.q,
  NonceHealthCheckQueue.q,
];

export const withAdminRoutes = async (fastify: FastifyInstance) => {
  // Configure basic auth.
  await fastify.register(fastifyBasicAuth, {
    validate: (username, password, req, reply, done) => {
      if (assertAdminBasicAuth(username, password)) {
        done();
        return;
      }
      done(new Error("Unauthorized"));
    },
    authenticate: true,
  });

  // Set up routes after Fastify is set up.
  fastify.after(async () => {
    // Register bullboard UI.
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

    // Apply basic auth only to admin routes.
    fastify.addHook("onRequest", (req, reply, done) => {
      if (req.url.startsWith(ADMIN_QUEUES_BASEPATH)) {
        fastify.basicAuth(req, reply, (error) => {
          if (error) {
            reply
              .status(StatusCodes.UNAUTHORIZED)
              .send({ error: "Unauthorized" });
            return done(error);
          }
        });
      }
      done();
    });
  });
};

const assertAdminBasicAuth = (username: string, password: string) => {
  if (username === "admin") {
    try {
      const buf1 = Buffer.from(password.padEnd(100));
      const buf2 = Buffer.from(ADMIN_ROUTES_PASSWORD.padEnd(100));
      return timingSafeEqual(buf1, buf2);
    } catch (e) {}
  }
  return false;
};
