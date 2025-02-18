import { type Static, Type } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { isContractSubscribed } from "../../../../shared/db/contract-subscriptions/get-contract-subscriptions";
import { getContractTransactionReceiptsByBlock } from "../../../../shared/db/contract-transaction-receipts/get-contract-transaction-receipts";
import { createCustomError } from "../../../middleware/error";
import {
  contractParamSchema,
  standardResponseSchema,
} from "../../../schemas/shared-api-schemas";
import { transactionReceiptSchema } from "../../../schemas/transaction-receipt";
import { getChainIdFromChain } from "../../../utils/chain";

const requestQuerySchema = Type.Object({
  fromBlock: Type.Integer({ minimum: 0 }),
  toBlock: Type.Optional(Type.Integer({ minimum: 0 })),
});

const responseSchema = Type.Object({
  result: Type.Object({
    receipts: Type.Array(transactionReceiptSchema),
    status: Type.String(),
  }),
});

responseSchema.example = {
  result: {
    receipts: [
      {
        chainId: 1,
        blockNumber: 100,
        contractAddress: "0x...",
        transactionHash: "0x...",
        blockHash: "0x...",
        timestamp: 100,

        to: "0x...",
        from: "0x...",
        transactionIndex: 1,

        gasUsed: "1000",
        effectiveGasPrice: "1000",
        status: 1,
      },
    ],
    status: "success",
  },
};

// TODO: throw this into config
const MAX_ALLOWED_QUERY_BLOCKS = 100;

export async function getContractTransactionReceipts(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof contractParamSchema>;
    Reply: Static<typeof responseSchema>;
    Querystring: Static<typeof requestQuerySchema>;
  }>({
    method: "GET",
    url: "/contract/:chain/:contractAddress/transactions/get-receipts",
    schema: {
      summary: "Get subscribed contract transaction receipts",
      description: "Get event logs for a subscribed contract",
      tags: ["Contract-Transactions"],
      operationId: "getContractTransactionReceipts",
      params: contractParamSchema,
      querystring: requestQuerySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
      hide: true,
    },
    handler: async (request, reply) => {
      const { chain, contractAddress } = request.params;
      const { fromBlock, toBlock } = request.query;

      if (toBlock && toBlock < fromBlock) {
        throw createCustomError(
          "toBlock cannot be less than fromBlock",
          StatusCodes.BAD_REQUEST,
          "BAD_REQUEST",
        );
      }

      if (toBlock && toBlock - fromBlock > MAX_ALLOWED_QUERY_BLOCKS) {
        throw createCustomError(
          `cannot query more than ${MAX_ALLOWED_QUERY_BLOCKS}`,
          StatusCodes.BAD_REQUEST,
          "BAD_REQUEST",
        );
      }

      const standardizedContractAddress = contractAddress.toLowerCase();

      const chainId = await getChainIdFromChain(chain);

      // check if subscribed, if not tell user to subscribe
      const isSubscribed = await isContractSubscribed({
        chainId,
        contractAddress: standardizedContractAddress,
      });

      if (!isSubscribed) {
        const subscriptionUrl = `/contract/${chain}/${contractAddress}/subscribe`;
        throw createCustomError(
          `Contract is not subscribed to! To subscribe, please use ${subscriptionUrl}`,
          StatusCodes.NOT_FOUND,
          "NOT_FOUND",
        );
      }

      const resultTransactionReceipts =
        await getContractTransactionReceiptsByBlock({
          chainId,
          contractAddress: standardizedContractAddress,
          fromBlock,
          toBlock,
        });

      const transactionReceipts = resultTransactionReceipts.map((txRcpt) => {
        return {
          chainId: Number.parseInt(txRcpt.chainId),
          blockNumber: txRcpt.blockNumber,
          contractAddress: txRcpt.contractAddress,
          transactionHash: txRcpt.transactionHash,
          blockHash: txRcpt.blockHash,
          timestamp: txRcpt.timestamp.getTime(),
          data: txRcpt.data,
          value: txRcpt.value,
          to: txRcpt.to,
          from: txRcpt.from,
          transactionIndex: txRcpt.transactionIndex,

          gasUsed: txRcpt.gasUsed,
          effectiveGasPrice: txRcpt.effectiveGasPrice,
          status: txRcpt.status,
        };
      });

      reply.status(StatusCodes.OK).send({
        result: {
          receipts: transactionReceipts,
          status: "success",
        },
      });
    },
  });
}
