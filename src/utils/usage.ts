import { Static, Type } from "@sinclair/typebox";
import { TransactionErrorInfo } from "@thirdweb-dev/sdk";
import { UsageEvent } from "@thirdweb-dev/service-utils/cf-worker";
import {
  deriveClientIdFromSecretKeyHash,
  hashSecretKey,
} from "@thirdweb-dev/service-utils/node";
import { FastifyInstance } from "fastify";
import { contractParamSchema } from "../server/schemas/sharedApiSchemas";
import { walletParamSchema } from "../server/schemas/wallet";
import { getChainIdFromChain } from "../server/utils/chain";
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
      const secretKey = env.THIRDWEB_API_SECRET_KEY;
      if (!secretKey) {
        throw new Error("No secret key found for usage reporting.");
      }

      const requestParams = request?.params as Static<
        typeof EngineRequestParams
      >;
      // hash the secret key
      const secretKeyHash = hashSecretKey(secretKey);
      // derive the client id from the secret key hash
      const derivedClientId = deriveClientIdFromSecretKeyHash(secretKeyHash);
      const headers = createHeaderForRequest({
        clientId: derivedClientId,
      });

      const chainId = requestParams?.chain
        ? await getChainIdFromChain(requestParams.chain)
        : "";

      if (reply.request.routerPath === "" || !reply.request.routerPath) {
        return;
      }

      const requestBody: UsageEventSchema = {
        source: "engine",
        action: UsageEventTxActionEnum.APIRequest,
        clientId: derivedClientId,
        pathname: reply.request.routerPath,
        chainId: chainId || undefined,
        walletAddress: requestParams.walletAddress || undefined,
        contractAddress: requestParams.contractAddress || undefined,
        httpStatusCode: reply.statusCode,
      };

      await fetch(env.CLIENT_ANALYTICS_URL, {
        method: "POST",
        headers,
        body: JSON.stringify(requestBody),
      });
    } catch (e) {
      console.error("Publishing to usage tracker queue:", e);
    }
  });
};

export const reportUsage = async (usageParams: ReportUsageParams[]) => {
  try {
    usageParams.map(async (item) => {
      try {
        const secretKey = env.THIRDWEB_API_SECRET_KEY;
        if (!secretKey) {
          throw new Error("No secret key found for usage reporting.");
        }

        // hash the secret key
        const secretKeyHash = hashSecretKey(secretKey);
        // derive the client id from the secret key hash
        const derivedClientId = deriveClientIdFromSecretKeyHash(secretKeyHash);
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

        await fetch(env.CLIENT_ANALYTICS_URL, {
          method: "POST",
          headers,
          body: JSON.stringify(requestBody),
        });
      } catch (e) {
        logger({
          service: "worker",
          level: "error",
          message: `[reportUsage] Error:`,
          error: e,
        });
      }
    });
  } catch (error) {
    logger({
      service: "worker",
      level: "error",
      message: `[reportUsage] Error:`,
      error,
    });
  }
};
