import { Static } from "@sinclair/typebox";
import { UsageEvent } from "@thirdweb-dev/service-utils/cf-worker";
import { FastifyInstance } from "fastify";
import { Address, Hex } from "thirdweb";
import { ADMIN_QUEUES_BASEPATH } from "../server/middleware/adminRoutes";
import { contractParamSchema } from "../server/schemas/sharedApiSchemas";
import { walletWithAddressParamSchema } from "../server/schemas/wallet";
import { getChainIdFromChain } from "../server/utils/chain";
import { env } from "./env";
import { logger } from "./logger";
import { thirdwebClientId } from "./sdk";

export interface ReportUsageParams {
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
    onChainTxStatus?: number;
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

const ANALYTICS_DEFAULT_HEADERS = {
  "Content-Type": "application/json",
  "x-sdk-version": process.env.ENGINE_VERSION,
  "x-product-name": "engine",
  "x-client-id": thirdwebClientId,
} as HeadersInit;

const SKIP_USAGE_PATHS = new Set([
  "",
  "/",
  "/favicon.ico",
  "/system/health",
  "/json",
  "/static",
]);

export const withServerUsageReporting = (server: FastifyInstance) => {
  // Skip reporting if CLIENT_ANALYTICS_URL is unset.
  if (env.CLIENT_ANALYTICS_URL === "") {
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

    const requestBody: UsageEvent = {
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
    };

    fetch(env.CLIENT_ANALYTICS_URL, {
      method: "POST",
      headers: ANALYTICS_DEFAULT_HEADERS,
      body: JSON.stringify(requestBody),
    }).catch(() => {}); // Catch uncaught exceptions since this fetch call is non-blocking.
  });
};

export const reportUsage = (usageEvents: ReportUsageParams[]) => {
  // Skip reporting if CLIENT_ANALYTICS_URL is unset.
  if (env.CLIENT_ANALYTICS_URL === "") {
    return;
  }

  usageEvents.map(async ({ action, input, error }) => {
    try {
      const requestBody: UsageEvent = {
        source: "engine",
        action,
        clientId: thirdwebClientId,
        chainId: input.chainId,
        walletAddress: input.from,
        contractAddress: input.to,
        transactionValue: input.value?.toString(),
        transactionHash: input.transactionHash,
        userOpHash: input.userOpHash,
        errorCode: input.onChainTxStatus === 0 ? "EXECUTION_REVERTED" : error,
        functionName: input.functionName,
        extension: input.extension,
        retryCount: input.retryCount,
        provider: input.provider,
        msSinceQueue: input.msSinceQueue,
        msSinceSend: input.msSinceSend,
      };

      fetch(env.CLIENT_ANALYTICS_URL, {
        method: "POST",
        headers: ANALYTICS_DEFAULT_HEADERS,
        body: JSON.stringify(requestBody),
      }).catch(() => {}); // Catch uncaught exceptions since this fetch call is non-blocking.
    } catch (e) {
      logger({
        service: "worker",
        level: "error",
        message: `Error:`,
        error: e,
      });
    }
  });
};
