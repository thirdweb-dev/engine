import { Static, Type } from "@sinclair/typebox";
import { TransactionErrorInfo } from "@thirdweb-dev/sdk";
import { UsageEvent } from "@thirdweb-dev/service-utils/cf-worker";
import { FastifyInstance } from "fastify";
import { contractParamSchema } from "../server/schemas/sharedApiSchemas";
import { walletParamSchema } from "../server/schemas/wallet";
import { getChainIdFromChain } from "../server/utils/chain";
import { env } from "./env";
import { logger } from "./logger";
import { thirdwebClientId } from "./sdk";

export interface ReportUsageParams {
  action: UsageEventType;
  data: {
    chainId: number;
    fromAddress?: string;
    toAddress?: string;
    value?: bigint;
    transactionHash?: string;
    onChainTxStatus?: number;
    userOpHash?: string;
    functionName?: string;
    extension?: string;
    retryCount?: number;
    provider?: string;
    msSinceQueue?: number;
    msSinceSend?: number;
  };
  error?: TransactionErrorInfo;
}

const EngineRequestParams = Type.Object({
  ...contractParamSchema.properties,
  ...walletParamSchema.properties,
});

export enum UsageEventType {
  MineTx = "mine_tx",
  NotSendTx = "not_send_tx",
  QueueTx = "queue_tx",
  SendTx = "send_tx",
  CancelTx = "cancel_tx",
  APIRequest = "api_request",
  ErrorTx = "error_tx",
}

const URLS_LIST_TO_NOT_REPORT_USAGE = new Set([
  "/",
  "/favicon.ico",
  "/system/health",
  "/json",
  "/static",
  "",
]);

const defaultHeaders: HeadersInit = {
  "Content-Type": "application/json",
  "x-sdk-version": process.env.ENGINE_VERSION ?? "",
  "x-product-name": "engine",
  "x-client-id": thirdwebClientId,
};

export const withServerUsageReporting = (server: FastifyInstance) => {
  // Skip reporting if CLIENT_ANALYTICS_URL is not set.
  if (env.CLIENT_ANALYTICS_URL === "") {
    return;
  }

  server.addHook("onResponse", async (request, reply) => {
    if (
      URLS_LIST_TO_NOT_REPORT_USAGE.has(reply.request.routerPath) ||
      reply.request.method === "OPTIONS"
    ) {
      return;
    }

    const requestParams = request?.params as Static<typeof EngineRequestParams>;

    const chainId = requestParams?.chain
      ? await getChainIdFromChain(requestParams.chain)
      : undefined;

    const requestBody: UsageEvent = {
      source: "engine",
      action: UsageEventType.APIRequest,
      clientId: thirdwebClientId,
      pathname: reply.request.routerPath,
      chainId,
      walletAddress: requestParams.walletAddress,
      contractAddress: requestParams.contractAddress,
      httpStatusCode: reply.statusCode,
      msTotalDuration: Math.ceil(reply.getResponseTime()),
    };

    fetch(env.CLIENT_ANALYTICS_URL, {
      method: "POST",
      headers: defaultHeaders,
      body: JSON.stringify(requestBody),
    }).catch(() => {}); // Catch uncaught exceptions since this fetch call is non-blocking.
  });
};

export const reportUsage = (usageEvents: ReportUsageParams[]) => {
  // Skip reporting if CLIENT_ANALYTICS_URL is not set.
  if (env.CLIENT_ANALYTICS_URL === "") {
    return;
  }

  usageEvents.map(async (event) => {
    try {
      const requestBody: UsageEvent = {
        source: "engine",
        action: event.action,
        clientId: thirdwebClientId,
        chainId: event.data.chainId,
        walletAddress: event.data.fromAddress,
        contractAddress: event.data.toAddress,
        transactionValue: event.data.value?.toString(),
        transactionHash: event.data.transactionHash,
        userOpHash: event.data.userOpHash,
        errorCode:
          event.data.onChainTxStatus === 0
            ? "EXECUTION_REVERTED"
            : event.error?.reason,
        functionName: event.data.functionName,
        extension: event.data.extension,
        retryCount: event.data.retryCount,
        provider: event.data.provider,
        msSinceSend: event.data.msSinceSend,
        msSinceQueue: event.data.msSinceQueue,
      };

      fetch(env.CLIENT_ANALYTICS_URL, {
        method: "POST",
        headers: defaultHeaders,
        body: JSON.stringify(requestBody),
      }).catch(() => {}); // Catch uncaught exceptions since this fetch call is non-blocking.
    } catch (error) {
      logger({
        service: "worker",
        level: "error",
        message: `Error:`,
        error,
      });
    }
  });
};
