import { Type, type Static } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { redis } from "../../../shared/utils/redis/redis";
import { getUsedBackendWallets } from "../../../shared/db/wallets/wallet-nonce";
import { SendTransactionQueue } from "../../../worker/queues/send-transaction-queue";
import { MineTransactionQueue } from "../../../worker/queues/mine-transaction-queue";
import { SendWebhookQueue } from "../../../worker/queues/send-webhook-queue";
import { PruneTransactionsQueue } from "../../../worker/queues/prune-transactions-queue";
import { CancelRecycledNoncesQueue } from "../../../worker/queues/cancel-recycled-nonces-queue";
import { NonceResyncQueue } from "../../../worker/queues/nonce-resync-queue";
import { ProcessEventsLogQueue } from "../../../worker/queues/process-event-logs-queue";
import { ProcessTransactionReceiptsQueue } from "../../../worker/queues/process-transaction-receipts-queue";
import { env } from "../../../shared/utils/env";
import { getConfig } from "../../../shared/utils/cache/get-config";
import { prisma } from "../../../shared/db/client";

const responseSchema = Type.Object({
  status: Type.String(),
  timestamp: Type.String(),
  version: Type.Optional(Type.String()),
  system: Type.Object({
    nodeEnv: Type.String(),
    engineMode: Type.String(),
    uptime: Type.Number(),
  }),
  redis: Type.Object({
    connected: Type.Boolean(),
    usedMemory: Type.Optional(Type.String()),
  }),
  database: Type.Object({
    connected: Type.Boolean(),
    totalTransactions: Type.Number(),
    pendingTransactions: Type.Number(),
    erroredTransactions: Type.Number(),
  }),
  queues: Type.Object({
    sendTransaction: Type.Object({
      waiting: Type.Number(),
      active: Type.Number(),
      completed: Type.Number(),
      failed: Type.Number(),
    }),
    mineTransaction: Type.Object({
      waiting: Type.Number(),
      active: Type.Number(),
      completed: Type.Number(),
      failed: Type.Number(),
    }),
    sendWebhook: Type.Object({
      waiting: Type.Number(),
      active: Type.Number(),
      completed: Type.Number(),
      failed: Type.Number(),
    }),
    pruneTransactions: Type.Object({
      waiting: Type.Number(),
      active: Type.Number(),
    }),
    cancelRecycledNonces: Type.Object({
      waiting: Type.Number(),
      active: Type.Number(),
    }),
    nonceResync: Type.Object({
      waiting: Type.Number(),
      active: Type.Number(),
    }),
    processEventLogs: Type.Object({
      waiting: Type.Number(),
      active: Type.Number(),
    }),
    processTransactionReceipts: Type.Object({
      waiting: Type.Number(),
      active: Type.Number(),
    }),
  }),
  wallets: Type.Object({
    totalActive: Type.Number(),
    byChain: Type.Array(
      Type.Object({
        chainId: Type.Number(),
        count: Type.Number(),
      }),
    ),
  }),
  configuration: Type.Object({
    ipAllowlistEnabled: Type.Boolean(),
    webhookConfigured: Type.Boolean(),
    rateLimitPerMin: Type.Number(),
  }),
});

export async function healthDetailed(fastify: FastifyInstance) {
  fastify.get(
    "/system/health/detailed",
    {
      schema: {
        summary: "Get detailed health check",
        description:
          "Returns comprehensive health status including queue metrics, database stats, and system information. Useful for monitoring and debugging.",
        tags: ["System"],
        operationId: "healthDetailed",
        response: {
          [StatusCodes.OK]: responseSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        // Check Redis connection
        let redisConnected = false;
        let redisMemory: string | undefined;
        try {
          await redis.ping();
          redisConnected = true;
          const info = await redis.info("memory");
          const match = info.match(/used_memory_human:([^\r\n]+)/);
          if (match) {
            redisMemory = match[1].trim();
          }
        } catch (e) {
          // Redis not available
        }

        // Check database connection and get stats
        let dbConnected = false;
        let totalTxCount = 0;
        let pendingTxCount = 0;
        let erroredTxCount = 0;
        try {
          totalTxCount = await prisma.transactions.count();
          pendingTxCount = await prisma.transactions.count({
            where: {
              minedAt: null,
              cancelledAt: null,
              errorMessage: null,
            },
          });
          erroredTxCount = await prisma.transactions.count({
            where: {
              errorMessage: { not: null },
            },
          });
          dbConnected = true;
        } catch (e) {
          // Database not available
        }

        // Get queue statistics
        const [
          sendTxWaiting,
          sendTxActive,
          sendTxCompleted,
          sendTxFailed,
          mineTxWaiting,
          mineTxActive,
          mineTxCompleted,
          mineTxFailed,
          webhookWaiting,
          webhookActive,
          webhookCompleted,
          webhookFailed,
          pruneWaiting,
          pruneActive,
          cancelNoncesWaiting,
          cancelNoncesActive,
          nonceResyncWaiting,
          nonceResyncActive,
          processEventsWaiting,
          processEventsActive,
          processReceiptsWaiting,
          processReceiptsActive,
        ] = await Promise.all([
          SendTransactionQueue.q.getWaitingCount(),
          SendTransactionQueue.q.getActiveCount(),
          SendTransactionQueue.q.getCompletedCount(),
          SendTransactionQueue.q.getFailedCount(),
          MineTransactionQueue.q.getWaitingCount(),
          MineTransactionQueue.q.getActiveCount(),
          MineTransactionQueue.q.getCompletedCount(),
          MineTransactionQueue.q.getFailedCount(),
          SendWebhookQueue.q.getWaitingCount(),
          SendWebhookQueue.q.getActiveCount(),
          SendWebhookQueue.q.getCompletedCount(),
          SendWebhookQueue.q.getFailedCount(),
          PruneTransactionsQueue.q.getWaitingCount(),
          PruneTransactionsQueue.q.getActiveCount(),
          CancelRecycledNoncesQueue.q.getWaitingCount(),
          CancelRecycledNoncesQueue.q.getActiveCount(),
          NonceResyncQueue.q.getWaitingCount(),
          NonceResyncQueue.q.getActiveCount(),
          ProcessEventsLogQueue.q.getWaitingCount(),
          ProcessEventsLogQueue.q.getActiveCount(),
          ProcessTransactionReceiptsQueue.q.getWaitingCount(),
          ProcessTransactionReceiptsQueue.q.getActiveCount(),
        ]);

        // Get wallet statistics
        const usedWallets = await getUsedBackendWallets();
        const walletsByChain = usedWallets.reduce(
          (acc, wallet) => {
            const existing = acc.find((w) => w.chainId === wallet.chainId);
            if (existing) {
              existing.count++;
            } else {
              acc.push({ chainId: wallet.chainId, count: 1 });
            }
            return acc;
          },
          [] as { chainId: number; count: number }[],
        );

        // Get configuration
        const config = await getConfig();

        const health = {
          status: dbConnected && redisConnected ? "healthy" : "degraded",
          timestamp: new Date().toISOString(),
          version: env.ENGINE_VERSION,
          system: {
            nodeEnv: env.NODE_ENV,
            engineMode: env.ENGINE_MODE,
            uptime: process.uptime(),
          },
          redis: {
            connected: redisConnected,
            usedMemory: redisMemory,
          },
          database: {
            connected: dbConnected,
            totalTransactions: totalTxCount,
            pendingTransactions: pendingTxCount,
            erroredTransactions: erroredTxCount,
          },
          queues: {
            sendTransaction: {
              waiting: sendTxWaiting,
              active: sendTxActive,
              completed: sendTxCompleted,
              failed: sendTxFailed,
            },
            mineTransaction: {
              waiting: mineTxWaiting,
              active: mineTxActive,
              completed: mineTxCompleted,
              failed: mineTxFailed,
            },
            sendWebhook: {
              waiting: webhookWaiting,
              active: webhookActive,
              completed: webhookCompleted,
              failed: webhookFailed,
            },
            pruneTransactions: {
              waiting: pruneWaiting,
              active: pruneActive,
            },
            cancelRecycledNonces: {
              waiting: cancelNoncesWaiting,
              active: cancelNoncesActive,
            },
            nonceResync: {
              waiting: nonceResyncWaiting,
              active: nonceResyncActive,
            },
            processEventLogs: {
              waiting: processEventsWaiting,
              active: processEventsActive,
            },
            processTransactionReceipts: {
              waiting: processReceiptsWaiting,
              active: processReceiptsActive,
            },
          },
          wallets: {
            totalActive: usedWallets.length,
            byChain: walletsByChain.sort((a, b) => b.count - a.count),
          },
          configuration: {
            ipAllowlistEnabled: config.ipAllowlist.length > 0,
            webhookConfigured: !!config.webhookUrl,
            rateLimitPerMin: env.GLOBAL_RATE_LIMIT_PER_MIN,
          },
        } satisfies Static<typeof responseSchema>;

        reply.status(StatusCodes.OK).send(health);
      } catch (error) {
        reply.status(StatusCodes.INTERNAL_SERVER_ERROR).send({
          status: "error",
          timestamp: new Date().toISOString(),
          error: "Failed to fetch health details",
        });
      }
    },
  );
}
