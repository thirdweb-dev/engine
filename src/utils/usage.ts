import { Static, Type } from "@sinclair/typebox";
import { TransactionErrorInfo } from "@thirdweb-dev/sdk";
import { UsageEvent } from "@thirdweb-dev/service-utils/cf-worker";
import { FastifyInstance } from "fastify";
import { contractParamSchema } from "../server/schemas/sharedApiSchemas";
import { walletParamSchema } from "../server/schemas/wallet";
import { getChainIdFromChain } from "../server/utils/chain";
import { deriveClientId } from "./api-keys";
import { env } from "./env";
import { logger } from "./logger";

type CreateHeaderForRequestParams = {
  clientId: string;
  backendwalletAddress?: string;
  chainId?: string;
};

export interface ReportUsageParams {
  action: UsageEventTxActionEnum;
  input: {
    chainId?: string;
    fromAddress?: string;
    toAddress?: string;
    value?: string;
    transactionHash?: string;
    onChainTxStatus?: number;
    userOpHash?: string;
    functionName?: string;
    extension?: string;
    retryCount?: number;
    provider?: string;
    transactionValue?: string;
    msSinceQueue?: number;
    msSinceSend?: number;
  };
  error?: TransactionErrorInfo;
}

const EngineRequestParams = Type.Object({
  ...contractParamSchema.properties,
  ...walletParamSchema.properties,
});

export enum UsageEventTxActionEnum {
  MineTx = "mine_tx",
  NotSendTx = "not_send_tx",
  QueueTx = "queue_tx",
  SendTx = "send_tx",
  CancelTx = "cancel_tx",
  APIRequest = "api_request",
}

interface UsageEventSchema extends Omit<UsageEvent, "action"> {
  action: UsageEventTxActionEnum;
}

const URLS_LIST_TO_NOT_REPORT_USAGE = new Set([
  "/",
  "/favicon.ico",
  "/system/health",
  "/json",
  "/static",
  "",
]);

const createHeaderForRequest = (input: CreateHeaderForRequestParams) => {
  return {
    "Content-Type": "application/json",
    "x-sdk-version": process.env.ENGINE_VERSION,
    "x-product-name": "engine",
    "x-client-id": input.clientId,
  } as HeadersInit;
};

export const withServerUsageReporting = (server: FastifyInstance) => {
  server.addHook("onResponse", async (request, reply) => {
    try {
      // If the CLIENT_ANALYTICS_URL is not set, then we don't want to report usage
      if (env.CLIENT_ANALYTICS_URL === "") {
        return;
      }

      if (
        URLS_LIST_TO_NOT_REPORT_USAGE.has(reply.request.routerPath) ||
        reply.request.method === "OPTIONS"
      ) {
        return;
      }

      const derivedClientId = deriveClientId(env.THIRDWEB_API_SECRET_KEY);
      const headers = createHeaderForRequest({
        clientId: derivedClientId,
      });

      const requestParams = request?.params as Static<
        typeof EngineRequestParams
      >;

      const chainId = requestParams?.chain
        ? await getChainIdFromChain(requestParams.chain)
        : "";

      const requestBody: UsageEventSchema = {
        source: "engine",
        action: UsageEventTxActionEnum.APIRequest,
        clientId: derivedClientId,
        pathname: reply.request.routerPath,
        chainId: chainId || undefined,
        walletAddress: requestParams.walletAddress || undefined,
        contractAddress: requestParams.contractAddress || undefined,
        httpStatusCode: reply.statusCode,
        msTotalDuration: Math.ceil(reply.getResponseTime()),
      };

      fetch(env.CLIENT_ANALYTICS_URL, {
        method: "POST",
        headers,
        body: JSON.stringify(requestBody),
      });
    } catch (e) {}
  });
};

export const reportUsage = (usageParams: ReportUsageParams[]) => {
  try {
    usageParams.map(async (item) => {
      try {
        // If the CLIENT_ANALYTICS_URL is not set, then we don't want to report usage
        if (env.CLIENT_ANALYTICS_URL === "") {
          return;
        }

        const derivedClientId = deriveClientId(env.THIRDWEB_API_SECRET_KEY);
        const headers = createHeaderForRequest({
          clientId: derivedClientId,
        });

        const chainId = item.input.chainId
          ? parseInt(item.input.chainId)
          : undefined;
        const requestBody: UsageEventSchema = {
          source: "engine",
          action: item.action,
          clientId: derivedClientId,
          chainId,
          walletAddress: item.input.fromAddress || undefined,
          contractAddress: item.input.toAddress || undefined,
          transactionValue: item.input.value || undefined,
          transactionHash: item.input.transactionHash || undefined,
          userOpHash: item.input.userOpHash || undefined,
          errorCode: item.input.onChainTxStatus
            ? item.input.onChainTxStatus === 0
              ? "EXECUTION_REVERTED"
              : undefined
            : item.error?.reason || undefined,
          functionName: item.input.functionName || undefined,
          extension: item.input.extension || undefined,
          retryCount: item.input.retryCount || undefined,
          provider: item.input.provider || undefined,
          msSinceSend: item.input.msSinceSend || undefined,
          msSinceQueue: item.input.msSinceQueue || undefined,
        };

        fetch(env.CLIENT_ANALYTICS_URL, {
          method: "POST",
          headers,
          body: JSON.stringify(requestBody),
        });
      } catch (e) {}
    });
  } catch (error) {
    logger({
      service: "worker",
      level: "error",
      message: `Error:`,
      error,
    });
  }
};
