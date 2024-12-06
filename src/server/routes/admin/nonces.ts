import { type Static, Type } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import {
  type Address,
  eth_getTransactionCount,
  getAddress,
  getRpcClient,
} from "thirdweb";
import {
  getUsedBackendWallets,
  lastUsedNonceKey,
  recycledNoncesKey,
  sentNoncesKey,
} from "../../../shared/db/wallets/walletNonce";
import { getChain } from "../../../shared/utils/chain";
import { redis } from "../../../shared/utils/redis/redis";
import { thirdwebClient } from "../../../shared/utils/sdk";
import { AddressSchema } from "../../schemas/address";
import { standardResponseSchema } from "../../schemas/sharedApiSchemas";
import { walletWithAddressParamSchema } from "../../schemas/wallet";

export const responseBodySchema = Type.Object({
  result: Type.Array(
    Type.Object({
      walletAddress: {
        ...AddressSchema,
        description: "Backend wallet address",
      },
      chainId: Type.Integer({
        description: "Chain ID",
        examples: [80002],
      }),
      onchainNonce: Type.Integer({
        description: "Last mined nonce",
        examples: [0],
      }),
      lastUsedNonce: Type.Integer({
        description: "Last incremented nonce sent to the RPC",
        examples: [0],
      }),
      sentNonces: Type.Array(Type.Integer(), {
        description:
          "Nonces that were successfully sent to the RPC but not mined yet (in descending order)",
        examples: [[2, 1, 0]],
      }),
      recycledNonces: Type.Array(Type.Integer(), {
        examples: [[3, 2, 1]],
        description:
          "Nonces that were acquired but failed to be sent to the blockchain, waiting to be recycled or cancelled (in descending order)",
      }),
    }),
  ),
});

responseBodySchema.example = {
  result: [
    {
      walletAddress: "0xcedf3b4d8f7f1f7e0f7f0f7f0f7f0f7f0f7f0f7f",
      onchainNonce: 2,
      lastUsedNonce: 8,
      recycledNonces: [6, 7],
      chainId: 80002,
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
      const result = await getNonceDetails({
        walletAddress: walletAddress ? getAddress(walletAddress) : undefined,
        chainId: chain ? parseInt(chain) : undefined,
      });

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
  walletAddress?: Address;
  chainId?: number;
} = {}) => {
  const usedBackendWallets = await getUsedBackendWallets(
    chainId,
    walletAddress,
  );

  const pipeline = redis.pipeline();
  const onchainNoncePromises: Promise<number>[] = [];

  const keyMap = usedBackendWallets.map(({ chainId, walletAddress }) => {
    pipeline.get(lastUsedNonceKey(chainId, walletAddress));
    pipeline.smembers(sentNoncesKey(chainId, walletAddress));
    pipeline.smembers(recycledNoncesKey(chainId, walletAddress));

    onchainNoncePromises.push(getLastUsedOnchainNonce(chainId, walletAddress));

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
      onchainNonce: onchainNonces[index],
      lastUsedNonce: parseInt(lastUsedNonceResult[1] as string) ?? 0,
      sentNonces: (sentNoncesResult[1] as string[])
        .map((nonce) => parseInt(nonce))
        .sort((a, b) => b - a),
      recycledNonces: (recycledNoncesResult[1] as string[])
        .map((nonce) => parseInt(nonce))
        .sort((a, b) => b - a),
    };
  });
};

/*
 * Get the last used nonce onchain
 * @param chainId Chain ID
 * @param walletAddress Wallet address
 * @returns Next unused nonce
 */
export const getLastUsedOnchainNonce = async (
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
