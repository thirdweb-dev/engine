import { Type, type Static } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { env } from "../../../../utils/env";
import { createCustomError } from "../../../middleware/error";
import { TransactionHashSchema } from "../../../schemas/address";
import { chainIdOrSlugSchema } from "../../../schemas/chain";
import { standardResponseSchema } from "../../../schemas/sharedApiSchemas";
import { getChainIdFromChain } from "../../../utils/chain";

// INPUT
const requestSchema = Type.Object({
  chain: chainIdOrSlugSchema,
  userOpHash: {
    ...TransactionHashSchema,
    description: "User operation hash",
  },
});

// OUTPUT
export const responseBodySchema = Type.Object({
  // TODO: Use Type.Any() instead of strict typing.
  // UserOp receipts from different providers/chains may not have a consistent response,
  // so Engine would prefer to return _any_ result than fail due to strict typing errors.
  result: Type.Any(),
});

responseBodySchema.example = {
  result: {
    userOpHash:
      "0xa5a579c6fd86c2d8a4d27f5bb22796614d3a31bbccaba8f3019ec001e001b95f",
    sender: "0x8C6bdb488F664EB98E12cB2671fE2389Cc227D33",
    nonce: "0x18554d9a95404c5e8ac591f8608a18f80000000000000000",
    actualGasCost: "0x4b3b147f788710",
    actualGasUsed: "0x7f550",
    success: true,
    paymaster: "0xe3dc822D77f8cA7ac74c30B0dfFEA9FcDCAAA321",
    logs: [],
    receipt: {
      type: "eip1559",
      status: "success",
      cumulativeGasUsed: "0x4724c3",
      logsBloom:
        "0x010004000800020000000040000000000000040000000000000010000004000000080000001000000212841100000000041080000000000020000240000000000800000022001000400000080000028000040000000000200001000010000000000000000a0000000000000000800800000000004110004080800110282000000000000002000000000000000000000000000200000400000000000000240040200002000000000000400000000002000140000000000000000002200000004000000002000000000021000000000000000000000000800080108020000020000000080000000000000000000000000000000000000000000108000000102000",
      logs: [],
      transactionHash:
        "0x57465d20d634421008a167cfcfcde94847dba9d6b5d3652b071d4b84e5ce74ff",
      from: "0x43370996a3aff7b66b3ac7676dd973d01ecec039",
      to: "0x5ff137d4b0fdcd49dca30c7cf57e578a026d2789",
      contractAddress: null,
      gasUsed: "0x7ff5a",
      effectiveGasPrice: "0x89b098f46",
      blockHash:
        "0xeaeec1eff4095bdcae44d86574cf1bf08b14b26be571b7c2290f32f9f250c103",
      blockNumber: "0x31de70e",
      transactionIndex: 32,
      blobGasUsed: "0x0",
    },
  },
};

export async function getUserOpReceipt(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof responseBodySchema>;
  }>({
    method: "GET",
    url: "/transaction/:chain/userop-hash/:userOpHash",
    schema: {
      summary: "Get transaction receipt from user-op hash",
      description: "Get the transaction receipt from a user-op hash.",
      tags: ["Transaction"],
      operationId: "useropHashReceipt",
      params: requestSchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseBodySchema,
      },
    },
    handler: async (request, reply) => {
      const { chain, userOpHash } = request.params;
      const chainId = await getChainIdFromChain(chain);

      try {
        const url = `https://${chainId}.bundler.thirdweb.com`;
        const resp = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-secret-key": env.THIRDWEB_API_SECRET_KEY,
          },
          body: JSON.stringify({
            id: 0,
            jsonrpc: "2.0",
            method: "eth_getUserOperationReceipt",
            params: [userOpHash],
          }),
        });
        if (!resp.ok) {
          throw `Unexpected status ${resp.status} - ${await resp.text()}`;
        }

        const json = await resp.json();
        reply.status(StatusCodes.OK).send({
          result: json.result,
        });
      } catch {
        throw createCustomError(
          "Unable to get receipt.",
          StatusCodes.INTERNAL_SERVER_ERROR,
          "UserOpReceiptError",
        );
      }
    },
  });
}
