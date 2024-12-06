import { Type, type Static } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { eth_getTransactionCount, getRpcClient } from "thirdweb";
import { checksumAddress } from "thirdweb/utils";
import { getChain } from "../../../shared/utils/chain";
import { thirdwebClient } from "../../../shared/utils/sdk";
import { sendCancellationTransaction } from "../../../shared/utils/transaction/cancelTransaction";
import {
  requestQuerystringSchema,
  standardResponseSchema,
} from "../../schemas/sharedApiSchemas";
import {
  walletChainParamSchema,
  walletHeaderSchema,
} from "../../schemas/wallet";
import { getChainIdFromChain } from "../../utils/chain";

const requestSchema = walletChainParamSchema;

const requestBodySchema = Type.Object({
  toNonce: Type.Number({
    description:
      "The nonce to cancel up to, inclusive. Example: If the onchain nonce is 10 and 'toNonce' is 15, this request will cancel nonces: 11, 12, 13, 14, 15",
    examples: ["42"],
  }),
});

const responseBodySchema = Type.Object({
  result: Type.Object(
    {
      cancelledNonces: Type.Array(Type.Number()),
    },
    {
      examples: [
        {
          result: {
            cancelledNonces: [11, 12, 13, 14, 15],
          },
        },
      ],
    },
  ),
});

export async function cancelBackendWalletNoncesRoute(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof responseBodySchema>;
    Body: Static<typeof requestBodySchema>;
    Querystring: Static<typeof requestQuerystringSchema>;
  }>({
    method: "POST",
    url: "/backend-wallet/:chain/cancel-nonces",
    schema: {
      summary: "Cancel nonces",
      description:
        "Cancel all nonces up to the provided nonce. This is useful to unblock a backend wallet that has transactions waiting for nonces to be mined.",
      tags: ["Backend Wallet"],
      operationId: "cancelNonces",
      params: requestSchema,
      body: requestBodySchema,
      headers: walletHeaderSchema,
      querystring: requestQuerystringSchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseBodySchema,
      },
    },
    handler: async (request, reply) => {
      const { chain } = request.params;
      const { toNonce } = request.body;
      const { "x-backend-wallet-address": walletAddress } =
        request.headers as Static<typeof walletHeaderSchema>;

      const chainId = await getChainIdFromChain(chain);
      const from = checksumAddress(walletAddress);

      const rpcRequest = getRpcClient({
        client: thirdwebClient,
        chain: await getChain(chainId),
      });

      // Cancel starting from the next unused onchain nonce.
      const transactionCount = await eth_getTransactionCount(rpcRequest, {
        address: walletAddress,
        blockTag: "latest",
      });

      const cancelledNonces: number[] = [];
      for (let nonce = transactionCount; nonce <= toNonce; nonce++) {
        await sendCancellationTransaction({
          chainId,
          from,
          nonce,
        });
        cancelledNonces.push(nonce);
      }

      reply.status(StatusCodes.OK).send({
        result: {
          cancelledNonces,
        },
      });
    },
  });
}
