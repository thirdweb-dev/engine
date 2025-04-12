import { serveStatic } from "hono/bun";
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { HonoAdapter } from "@bull-board/hono";
import { externalBundlerConfirmQueue } from "../../executors/external-bundler/index.js";
import {
  externalBundlerConfirmQueue as externalBundlerConfirmQueueAsync,
  externalBundlerSendQueue,
} from "../../executors/external-bundler-async/index.js";
import { Hono } from "hono";
import { basicAuth } from "hono/basic-auth";
import { env } from "../../lib/env.js";
import { testQueue } from "../../executors/test/index.js";

import "../../executors/test/worker.js";

const serverAdapter = new HonoAdapter(serveStatic);

const queues = [
  externalBundlerConfirmQueue,
  testQueue,
  externalBundlerConfirmQueueAsync,
  externalBundlerSendQueue,
];
const bullBoardQueues = queues.map((queue) => new BullMQAdapter(queue));

export function setupQueuesUiRoutes(app: Hono, basePath: string) {
  const realm = "Thirdweb Engine Admin";

  createBullBoard({
    queues: bullBoardQueues,
    serverAdapter,
  });

  serverAdapter.setBasePath(basePath);

  const bullmqRoutes = new Hono();

  bullmqRoutes.use(
    basicAuth({
      username: "admin",
      password: env.THIRDWEB_API_SECRET_KEY,
      invalidUserMessage: "Invalid username or password",
      realm,
    }),
  );

  bullmqRoutes.route("", serverAdapter.registerPlugin());

  // we need a custom error handler because the default error has an invalid response (hono bug?)
  // this causes the browser to keep retrying even if authentication fails, and the browser window freezes
  bullmqRoutes.onError((_err, c) => {
    c.header("WWW-Authenticate", `Basic realm="${realm}"`);
    return c.json({ error: "Incorrect username or password" }, 401);
  });

  app.route(basePath, bullmqRoutes);
}
