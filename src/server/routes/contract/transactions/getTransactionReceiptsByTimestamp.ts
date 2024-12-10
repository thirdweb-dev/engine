import { Type, type Static } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getTransactionReceiptsByBlockTimestamp } from "../../../../shared/db/contractTransactionReceipts/get-contract-transaction-receipts";
import { AddressSchema } from "../../../schemas/address";
import { standardResponseSchema } from "../../../schemas/sharedApiSchemas";
import { transactionReceiptSchema } from "../../../schemas/transactionReceipt";

const requestQuerySchema = Type.Object({
  contractAddresses: Type.Optional(Type.Array(AddressSchema)),
  fromBlockTimestamp: Type.Integer({ minimum: 0 }),
  toBlockTimestamp: Type.Optional(Type.Integer({ minimum: 0 })),
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

export async function getContractTransactionReceiptsByTimestamp(
  fastify: FastifyInstance,
) {
  fastify.route<{
    Reply: Static<typeof responseSchema>;
    Querystring: Static<typeof requestQuerySchema>;
  }>({
    method: "GET",
    url: "/contract/transactions/get-receipts",
    schema: {
      summary: "Get subscribed contract transaction receipts",
      description: "Get transaction receipts for a subscribed contract",
      tags: ["Contract-Transactions"],
      operationId: "getContractTransactionReceiptsByTimestamp",
      querystring: requestQuerySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
      hide: true,
    },
    handler: async (request, reply) => {
      const { contractAddresses, fromBlockTimestamp, toBlockTimestamp } =
        request.query;

      const standardizedContractAddresses = contractAddresses?.map((val) =>
        val.toLowerCase(),
      );

      const resultTransactionReceipts =
        await getTransactionReceiptsByBlockTimestamp({
          fromBlockTimestamp,
          toBlockTimestamp,
          contractAddresses: standardizedContractAddresses,
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
