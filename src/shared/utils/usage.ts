import type { Static } from "@sinclair/typebox";
import {
  sendUsageV2Events,
  type ClientUsageV2Event,
  type UsageEvent,
} from "@thirdweb-dev/service-utils/cf-worker";
import type { FastifyInstance } from "fastify";
import type { Address, Hex } from "thirdweb";
import { ADMIN_QUEUES_BASEPATH } from "../../server/middleware/admin-routes";
import { OPENAPI_ROUTES } from "../../server/middleware/open-api";
import type { contractParamSchema } from "../../server/schemas/shared-api-schemas";
import type { walletWithAddressParamSchema } from "../../server/schemas/wallet";
import { getChainIdFromChain } from "../../server/utils/chain";
import { env } from "./env";
import { logger } from "./logger";
import { thirdwebClientId } from "./sdk";

interface ReportTransactionUsageParams {
  action:
    | "queue_tx"
    | "not_send_tx"
    | "send_tx"
    | "mine_tx"
    | "cancel_tx"
    | "error_tx"
    | "api_request";
  input: {
    chainId?: number;
    from?: Address;
    to?: Address;
    value?: bigint;
    transactionHash?: Hex;
    onchainStatus?: "success" | "reverted";
    userOpHash?: Hex;
    functionName?: string;
    extension?: string;
    retryCount?: number;
    provider?: string;
    msSinceQueue?: number;
    msSinceSend?: number;
  };
  error?: string;
}

const SKIP_USAGE_PATHS = new Set([
  "",
  "/",
  "/favicon.ico",
  "/system/health",
  "/static",
  ...OPENAPI_ROUTES,
]);

export function withServerUsageReporting(server: FastifyInstance) {
  // Skip reporting if analytics reporting is disabled.
  if (!env.CLIENT_ANALYTICS_URL && !env.ENABLE_USAGE_V2_ANALYTICS) {
    return;
  }

  server.addHook("onResponse", async (request, reply) => {
    if (
      request.method === "OPTIONS" ||
      !request.routeOptions.url ||
      SKIP_USAGE_PATHS.has(request.routeOptions.url) ||
      request.routeOptions.url.startsWith(ADMIN_QUEUES_BASEPATH)
    ) {
      return;
    }

    const requestParams = request.params as
      | (Static<typeof contractParamSchema> &
          Static<typeof walletWithAddressParamSchema>)
      | undefined;

    const chainId = requestParams?.chain
      ? await getChainIdFromChain(requestParams.chain)
      : undefined;

    await reportUsageV1([
      {
        source: "engine",
        action: "api_request",
        clientId: thirdwebClientId,
        pathname: reply.request.routeOptions.url,
        chainId,
        walletAddress: requestParams?.walletAddress,
        contractAddress: requestParams?.contractAddress,
        httpStatusCode: reply.statusCode,
        msTotalDuration: Math.ceil(reply.elapsedTime),
        httpMethod: request.method.toUpperCase() as UsageEvent["httpMethod"],
      },
    ]);
    // @TODO: UsageV2 reporting
  });
}

/**
 * Reports usage events.
 * This method must not throw uncaught exceptions and is safe to call non-blocking.
 */
export async function reportUsage(events: ReportTransactionUsageParams[]) {
  try {
    if (env.CLIENT_ANALYTICS_URL) {
      await reportUsageV1(
        events.map(({ action, input, error }) => ({
          source: "engine",
          action,
          clientId: thirdwebClientId,
          chainId: input.chainId,
          walletAddress: input.from,
          contractAddress: input.to,
          transactionValue: input.value?.toString(),
          transactionHash: input.transactionHash,
          userOpHash: input.userOpHash,
          errorCode:
            input.onchainStatus === "reverted" ? "EXECUTION_REVERTED" : error,
          functionName: input.functionName,
          extension: input.extension,
          retryCount: input.retryCount,
          provider: input.provider,
          msSinceQueue: input.msSinceQueue,
          msSinceSend: input.msSinceSend,
        })),
      );
    }
    if (env.ENABLE_USAGE_V2_ANALYTICS) {
      await reportUsageV2(
        events.map((event) => ({
          action: event.action,
          sdk_platform: env.ENGINE_TIER ?? "SELF_HOSTED",
          sdk_version: env.ENGINE_VERSION,
          product_name: "engine",
          chain_id: event.input.chainId,
          from_address: event.input.from,
          to_address: event.input.to,
          value: event.input.value?.toString(),
          transaction_hash: event.input.transactionHash,
          user_op_hash: event.input.userOpHash,
          function_name: event.input.functionName,
          retry_count: event.input.retryCount,
          rpc_provider: event.input.provider,
          ms_since_queue: event.input.msSinceQueue,
          ms_since_send: event.input.msSinceSend,
          onchain_status: event.input.onchainStatus,
        })),
      );
    }
  } catch (error) {
    logger({
      service: "server",
      level: "error",
      message: "reportUsage error",
      error,
    });
  }
}

// Generic usageV1 helper.
async function reportUsageV1(events: UsageEvent[]) {
  const BATCH_SIZE = 20;
  for (let i = 0; i < events.length; i += BATCH_SIZE) {
    const batch = events.slice(i, i + BATCH_SIZE);

    await Promise.allSettled(
      batch.map(async (event) => {
        await fetch(env.CLIENT_ANALYTICS_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-sdk-version": process.env.ENGINE_VERSION ?? "",
            "x-product-name": "engine",
            "x-client-id": thirdwebClientId,
          },
          body: JSON.stringify(event),
        });
      }),
    );
  }
}

// Generic usageV2 helper.
async function reportUsageV2(events: ClientUsageV2Event[]) {
  await sendUsageV2Events(events, {
    environment: env.NODE_ENV === "production" ? "production" : "development",
    source: "engine",
    thirdwebSecretKey: env.THIRDWEB_API_SECRET_KEY,
  });
}
