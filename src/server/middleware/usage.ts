import { Static, Type } from "@sinclair/typebox";
import {
  deriveClientIdFromSecretKeyHash,
  hashSecretKey,
} from "@thirdweb-dev/service-utils/node";
import { FastifyInstance } from "fastify";
import { env } from "../../utils/env";
import { contractParamSchema } from "../schemas/sharedApiSchemas";
import { walletParamSchema } from "../schemas/wallet";

type CreateHeaderForRequestParams = {
  clientId: string;
  backendwalletAddress?: string;
  chainId?: string;
};

const createHeaderForRequest = (input: CreateHeaderForRequestParams) => {
  return {
    "Content-Type": "application/json",
    "x-sdk-version": process.env.ENGINE_VERSION,
    "x-product-name": "engine",
    "x-client-id": input.clientId,
  } as HeadersInit;
};

const EngineRequestParams = Type.Object({
  ...contractParamSchema.properties,
  ...walletParamSchema.properties,
});

export const withUsageReporting = (server: FastifyInstance) => {
  server.addHook("onResponse", async (request, reply) => {
    try {
      // @TODO: get the secret key from the config
      // const config = await getConfig();
      // const secretKey = config.thirdwebApiSecretKey;
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
      const url =
        env.NODE_ENV === "production"
          ? "https://c.thirdweb.com/event"
          : "https://c.thirdweb-dev.com/event";

      const requestBody = {
        source: "engine",
        action: "request",

        // apiKeyId: apiKeyMeta?.id,
        creatorWalletAddress: env.ADMIN_WALLET_ADDRESS,
        clientId: derivedClientId,
        pathname: reply.request.routerPath,
        chainId: requestParams.chain || undefined,
        backendwalletAddress: requestParams.walletAddress || undefined,
        contractAddress: requestParams.contractAddress || undefined,
        method: reply.request.routerMethod,
        statusCode: reply.statusCode,
      };

      console.log("Request URL:", url);
      console.log("\tUsage reporting request body:\t", requestBody);

      await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(requestBody),
      });
    } catch (e) {
      console.error("Publishing to usage tracker queue:", e);
    }
  });
};
