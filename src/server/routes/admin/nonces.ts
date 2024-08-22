import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { eth_getTransactionCount, getRpcClient } from "thirdweb";
import {
  lastUsedNonceKey,
  recycledNoncesKey,
  sentNoncesKey,
  splitLastUsedNonceKey,
} from "../../../db/wallets/walletNonce";
import { getChain } from "../../../utils/chain";
import { normalizeAddress } from "../../../utils/primitiveTypes";
import { redis } from "../../../utils/redis/redis";
import { thirdwebClient } from "../../../utils/sdk";
import { standardResponseSchema } from "../../schemas/sharedApiSchemas";
import { walletWithAddressParamSchema } from "../../schemas/wallet";

export const responseBodySchema = Type.Object({
  result: Type.Array(
    Type.Object({
      walletAddress: Type.String({
        description: "Backend Wallet Address",
        examples: ["0xcedf3b4d8f7f1f7e0f7f0f7f0f7f0f7f0f7f0f7f"],
      }),
      onchainNonce: Type.String({
        description: "Last mined nonce",
        examples: ["0"],
      }),
      lastUsedNonce: Type.String({
        description: "Last incremented nonce sent to the blockchain",
        examples: ["0"],
      }),
      sentNonces: Type.Array(
        Type.String({
          examples: ["0"],
        }),
        {
          description:
            "Nonces that were successfully sent to the blockchain but not mined yet.",
        },
      ),
      recycledNonces: Type.Array(
        Type.String({
          examples: ["0"],
        }),
        {
          description:
            "Nonces that were acquired but failed to be sent to the blockchain, waiting to be recycled or cancelled.",
        },
      ),
      chainId: Type.Number({
        description: "Chain ID",
        examples: [80001],
      }),
    }),
  ),
});

responseBodySchema.example = {
  result: [
    {
      walletAddress: "0xcedf3b4d8f7f1f7e0f7f0f7f0f7f0f7f0f7f0f7f",
      onchainNonce: "2",
      lastUsedNonce: "8",
      recycledNonces: ["6", "7"],
      chainId: 80001,
    },
  ],
};

export async function getNonceDetailsRoute(fastify: FastifyInstance) {
  fastify.route<{
    Querystring: Static<typeof walletWithAddressParamSchema>;
    Reply: Static<typeof responseBodySchema>;
  }>({
    method: "GET",
    url: "/admin/nonces",
    schema: {
      summary: "Get transaction details",
      description: "Get raw logs and details for a transaction by queueId.",
      tags: ["Admin"],
      operationId: "transactionDetails",
      querystring: walletWithAddressParamSchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseBodySchema,
      },
      hide: true,
    },
    handler: async (request, reply) => {
      const { walletAddress, chain } = request.query;
      const result = await getNonceDetails({ walletAddress, chainId: chain });

      reply.status(StatusCodes.OK).send({
        result,
      });
    },
  });
}

export const getNonceDetails = async ({
  walletAddress,
  chainId,
}: {
  walletAddress?: string;
  chainId?: string;
} = {}) => {
  const lastUsedNonceKeys = await getLastUsedNonceKeys(walletAddress, chainId);

  const result = await Promise.all(
    lastUsedNonceKeys.map(async (key) => {
      const { chainId, walletAddress } = splitLastUsedNonceKey(key);

      const [lastUsedNonce, sentNonces, recycledNonces, onchainNonce] =
        await Promise.all([
          redis.get(lastUsedNonceKey(chainId, walletAddress)),
          redis.smembers(sentNoncesKey(chainId, walletAddress)),
          redis.smembers(recycledNoncesKey(chainId, walletAddress)),
          getOnchainNonce(chainId, walletAddress),
        ]);

      return {
        walletAddress,
        onchainNonce: onchainNonce.toString(),
        lastUsedNonce: lastUsedNonce ?? "0",
        sentNonces,
        recycledNonces,
        chainId,
      };
    }),
  );

  return result;
};

/**
 * Get all lastUsedNonce keys from Redis, based on the provided wallet address and chain.
 * @param walletAddress Wallet address to filter by (optional)
 * @param chainId chainId to filter by (optional)
 *
 * @returns Array of lastUsedNonce keys for wallet address and chain combinations
 */
const getLastUsedNonceKeys = async (
  walletAddress?: string,
  chainId?: string,
): Promise<string[]> => {
  const keys = await redis.keys(
    `nonce:${chainId ?? "*"}:${
      walletAddress ? normalizeAddress(walletAddress) : "*"
    }`,
  );

  return keys;
};

const getOnchainNonce = async (chainId: number, walletAddress: string) => {
  const rpcRequest = getRpcClient({
    client: thirdwebClient,
    chain: await getChain(chainId),
  });

  // The next unused nonce = transactionCount.
  const transactionCount = await eth_getTransactionCount(rpcRequest, {
    address: walletAddress,
  });

  const onchainNonce = transactionCount + 1;
  return onchainNonce;
};
