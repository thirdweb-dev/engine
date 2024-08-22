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
      chainId: Type.Number({
        description: "Chain ID",
        examples: [80002],
      }),
      onchainNonce: Type.String({
        description: "Last mined nonce",
        examples: ["0"],
      }),
      lastUsedNonce: Type.String({
        description: "Last incremented nonce sent to the blockchain",
        examples: ["0"],
      }),
      sentNonces: Type.Array(Type.String(), {
        description:
          "Nonces that were successfully sent to the RPC but not mined yet",
        examples: ["0"],
      }),
      recycledNonces: Type.Array(Type.String(), {
        examples: ["0"],
        description:
          "Nonces that were acquired but failed to be sent to the blockchain, waiting to be recycled or cancelled",
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

const walletWithAddressQuerySchema = Type.Partial(walletWithAddressParamSchema);

export async function getNonceDetailsRoute(fastify: FastifyInstance) {
  fastify.route<{
    Querystring: Static<typeof walletWithAddressQuerySchema>;
    Reply: Static<typeof responseBodySchema>;
  }>({
    method: "GET",
    url: "/admin/nonces",
    schema: {
      summary: "Get nonce status details for wallets",
      description:
        "Admin route to get nonce status details for all wallets filtered by address and chain ",
      tags: ["Admin"],
      operationId: "nonceDetails",
      querystring: walletWithAddressQuerySchema,
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

  const pipeline = redis.pipeline();
  const onchainNoncePromises: Promise<number>[] = [];

  const keyMap = lastUsedNonceKeys.map((key) => {
    const { chainId, walletAddress } = splitLastUsedNonceKey(key);

    pipeline.get(lastUsedNonceKey(chainId, walletAddress));
    pipeline.smembers(sentNoncesKey(chainId, walletAddress));
    pipeline.smembers(recycledNoncesKey(chainId, walletAddress));

    onchainNoncePromises.push(getOnchainNonce(chainId, walletAddress));

    return { chainId, walletAddress };
  });

  const [pipelineResults, onchainNonces] = await Promise.all([
    pipeline.exec(),
    Promise.all(onchainNoncePromises),
  ]);

  if (!pipelineResults) {
    throw new Error("Failed to execute Redis pipeline");
  }

  return keyMap.map((key, index) => {
    const pipelineOffset = index * 3;
    const [lastUsedNonceResult, sentNoncesResult, recycledNoncesResult] =
      pipelineResults.slice(pipelineOffset, pipelineOffset + 3);

    return {
      walletAddress: key.walletAddress,
      chainId: key.chainId,
      onchainNonce: onchainNonces[index].toString(),
      lastUsedNonce: (lastUsedNonceResult[1] as string | null) ?? "0",
      sentNonces: sentNoncesResult[1] as string[],
      recycledNonces: recycledNoncesResult[1] as string[],
    };
  });
};

/**
 * Get all lastUsedNonce keys from Redis, based on the provided wallet address and chain.
 * @param walletAddress Wallet address to filter by (optional)
 * @param chainId chainId to filter by (optional)
 *
 * @returns Array of lastUsedNonce keys for wallet address and chain combinations
 */
export const getLastUsedNonceKeys = async (
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

/*
 * Get the last used nonce onchain
 * @param chainId Chain ID
 * @param walletAddress Wallet address
 * @returns Next unused nonce
 */
export const getOnchainNonce = async (
  chainId: number,
  walletAddress: string,
) => {
  const rpcRequest = getRpcClient({
    client: thirdwebClient,
    chain: await getChain(chainId),
  });

  // The next unused nonce = transactionCount.
  const transactionCount = await eth_getTransactionCount(rpcRequest, {
    address: walletAddress,
    blockTag: "latest",
  });

  const onchainNonce = transactionCount - 1;
  return onchainNonce;
};
