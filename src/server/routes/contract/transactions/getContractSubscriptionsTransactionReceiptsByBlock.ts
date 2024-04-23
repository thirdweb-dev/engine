import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import {
  contractParamSchema,
  standardResponseSchema,
} from "../../../schemas/sharedApiSchemas";
import {
  toTransactionReceiptSchema,
  transactionReceiptSchema,
} from "../../../schemas/transactionReceipt";
import { getChainIdFromChain } from "../../../utils/chain";
import { getReceiptsByBlock } from "../subscriptions/getTransactionReceipts";

const requestQuerySchema = Type.Object({
  fromBlock: Type.Number(),
  toBlock: Type.Optional(Type.Number()),
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

export async function getContractSubscriptionsTransactionReceiptsByBlock(
  fastify: FastifyInstance,
) {
  fastify.route<{
    Params: Static<typeof contractParamSchema>;
    Reply: Static<typeof responseSchema>;
    Querystring: Static<typeof requestQuerySchema>;
  }>({
    method: "GET",
    url: "/contract/:chain/:contractAddress/transactions/get-receipts",
    schema: {
      summary: "Get transaction receipts by block",
      description:
        "(Deprecated) Get transaction receipts for a contract subscription by block range.",
      tags: ["Contract-Transactions"],
      operationId: "getContractSubscriptionsTransactionReceiptsByBlock",
      params: contractParamSchema,
      querystring: requestQuerySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
      hide: true,
      deprecated: true,
    },
    handler: async (request, reply) => {
      const { chain, contractAddress } = request.params;
      const { fromBlock, toBlock } = request.query;

      const chainId = await getChainIdFromChain(chain);

      const receipts = await getReceiptsByBlock({
        chainId: chainId.toString(),
        addresses: [contractAddress.toLowerCase()],
        fromBlock,
        toBlock,
      });

      reply.status(StatusCodes.OK).send({
        result: {
          receipts: receipts.map(toTransactionReceiptSchema),
          status: "success",
        },
      });
    },
  });
}
