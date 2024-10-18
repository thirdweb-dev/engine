import { Type, type Static } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import {
  eth_getTransactionReceipt,
  getRpcClient,
  toHex,
  type Hex,
} from "thirdweb";
import { stringify } from "thirdweb/utils";
import type { TransactionReceipt } from "viem";
import { getChain } from "../../../../utils/chain";
import {
  fromTransactionStatus,
  fromTransactionType,
  thirdwebClient,
} from "../../../../utils/sdk";
import { createCustomError } from "../../../middleware/error";
import { AddressSchema, TransactionHashSchema } from "../../../schemas/address";
import { standardResponseSchema } from "../../../schemas/sharedApiSchemas";
import { getChainIdFromChain } from "../../../utils/chain";

// INPUT
const requestSchema = Type.Object({
  transactionHash: {
    ...TransactionHashSchema,
    description: "Transaction hash",
  },
  chain: Type.String({
    examples: ["80002"],
    description: "Chain ID or name",
  }),
});

// OUTPUT
export const responseBodySchema = Type.Object({
  result: Type.Union([
    Type.Partial(
      Type.Object({
        to: Type.String(),
        from: Type.String(),
        contractAddress: Type.Union([AddressSchema, Type.Null()]),
        transactionIndex: Type.Number(),
        root: Type.String(),
        gasUsed: Type.String(),
        logsBloom: Type.String(),
        blockHash: Type.String(),
        transactionHash: TransactionHashSchema,
        logs: Type.Array(Type.Any()),
        blockNumber: Type.Number(),
        confirmations: Type.Number(),
        cumulativeGasUsed: Type.String(),
        effectiveGasPrice: Type.String(),
        byzantium: Type.Boolean(),
        type: Type.Number(),
        status: Type.Number(),
      }),
    ),
    Type.Null(),
  ]),
});

responseBodySchema.example = {
  result: {
    to: "0xd7419703c2D5737646525A8660906eCb612875BD",
    from: "0x9783Eb2a93A58b24CFeC56F94b30aB6e29fF4b38",
    contractAddress: null,
    transactionIndex: 69,
    gasUsed: "21000",
    logsBloom:
      "0x00000000000200000000000000000000000000000000000000000000000000000000000000000000000000100002000000008000000000000000000000002000000000000000000000000000000000800000000000000000000100000000040000000000000000000000000000000000008000000000000080000000000000000000000000000000000000000000000000000000000000040000000000000000200000000000004000800000000000000000000000000000000000000000004000000000000000000001000000000000000000000000800000108000000000000000000000000000000000000000000000000000000000000000008000100000",
    blockHash:
      "0x9be85de9e6a0717ed2e7c9035f7bd748a4b20bc9d6e04a6875fa69311421d971",
    transactionHash:
      "0xd9bcba8f5bc4ce5bf4d631b2a0144329c1df3b56ddb9fc64637ed3a4219dd087",
    logs: [
      {
        transactionIndex: 69,
        blockNumber: 51048531,
        transactionHash:
          "0xd9bcba8f5bc4ce5bf4d631b2a0144329c1df3b56ddb9fc64637ed3a4219dd087",
        address: "0x0000000000000000000000000000000000001010",
        topics: [
          "0xe6497e3ee548a3372136af2fcb0696db31fc6cf20260707645068bd3fe97f3c4",
          "0x0000000000000000000000000000000000000000000000000000000000001010",
          "0x0000000000000000000000009783eb2a93a58b24cfec56f94b30ab6e29ff4b38",
          "0x000000000000000000000000d7419703c2d5737646525a8660906ecb612875bd",
        ],
        data: "0x00000000000000000000000000000000000000000000000006a4d6a25acff49800000000000000000000000000000000000000000000000006b787e1bb9f06f80000000000000000000000000000000000000000000000051ac78aecb02246820000000000000000000000000000000000000000000000000012b13f60cf1260000000000000000000000000000000000000000000000005216c618f0af23b1a",
        logIndex: 181,
        blockHash:
          "0x9be85de9e6a0717ed2e7c9035f7bd748a4b20bc9d6e04a6875fa69311421d971",
      },
      {
        transactionIndex: 69,
        blockNumber: 51048531,
        transactionHash:
          "0xd9bcba8f5bc4ce5bf4d631b2a0144329c1df3b56ddb9fc64637ed3a4219dd087",
        address: "0x0000000000000000000000000000000000001010",
        topics: [
          "0x4dfe1bbbcf077ddc3e01291eea2d5c70c2b422b415d95645b9adcfd678cb1d63",
          "0x0000000000000000000000000000000000000000000000000000000000001010",
          "0x0000000000000000000000009783eb2a93a58b24cfec56f94b30ab6e29ff4b38",
          "0x000000000000000000000000a8b52f02108aa5f4b675bdcc973760022d7c6020",
        ],
        data: "0x00000000000000000000000000000000000000000000000000046a2c9f9fd11800000000000000000000000000000000000000000000000006ce8dc1a70476680000000000000000000000000000000000000000000006df390338516c1391c300000000000000000000000000000000000000000000000006ca23950764a5500000000000000000000000000000000000000000000006df3907a27e0bb362db",
        logIndex: 182,
        blockHash:
          "0x9be85de9e6a0717ed2e7c9035f7bd748a4b20bc9d6e04a6875fa69311421d971",
      },
    ],
    blockNumber: 51048531,
    confirmations: 3232643,
    cumulativeGasUsed: "5751865",
    effectiveGasPrice: "257158085297",
    status: 1,
    type: 2,
    byzantium: true,
  },
};

export async function getTransactionReceipt(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof responseBodySchema>;
  }>({
    method: "GET",
    url: "/transaction/:chain/tx-hash/:transactionHash",
    schema: {
      summary: "Get transaction receipt",
      description: "Get the transaction receipt from a transaction hash.",
      tags: ["Transaction"],
      operationId: "getTransactionReceipt",
      params: requestSchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseBodySchema,
      },
    },
    handler: async (request, reply) => {
      const { chain, transactionHash } = request.params;

      const chainId = await getChainIdFromChain(chain);
      const rpcRequest = getRpcClient({
        client: thirdwebClient,
        chain: await getChain(chainId),
      });

      let receipt: TransactionReceipt;
      try {
        receipt = await eth_getTransactionReceipt(rpcRequest, {
          hash: transactionHash as Hex,
        });
      } catch {
        throw createCustomError(
          "Transaction is not mined.",
          StatusCodes.BAD_REQUEST,
          "TRANSACTION_NOT_MINED",
        );
      }

      reply.status(StatusCodes.OK).send({
        result: {
          ...JSON.parse(stringify(receipt)),
          gasUsed: toHex(receipt.gasUsed),
          cumulativeGasUsed: toHex(receipt.cumulativeGasUsed),
          effectiveGasPrice: toHex(receipt.effectiveGasPrice),
          blockNumber: Number(receipt.blockNumber),
          type: fromTransactionType(receipt.type),
          status: fromTransactionStatus(receipt.status),
        },
      });
    },
  });
}
