import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { parseArrayString } from "../../../../utils/url";
import { standardResponseSchema } from "../../../schemas/sharedApiSchemas";
import {
  toTransactionReceiptSchema,
  transactionReceiptSchema,
} from "../../../schemas/transactionReceipt";
import { getReceiptsByTimestamp } from "../subscriptions/getTransactionReceipts";

const requestQuerySchema = Type.Object({
  contractAddresses: Type.Optional(Type.Array(Type.String())),
  fromBlockTimestamp: Type.Number(),
  toBlockTimestamp: Type.Optional(Type.Number()),
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

export async function getContractSubscriptionsTransactionReceiptsByTimestamp(
  fastify: FastifyInstance,
) {
  fastify.route<{
    Reply: Static<typeof responseSchema>;
    Querystring: Static<typeof requestQuerySchema>;
  }>({
    method: "GET",
    url: "/contract/transactions/get-receipts",
    schema: {
      summary: "Get transaction receipts by timestamp",
      description:
        "(Deprecated) Get transaction receipts for a contract subscription by timestamp range.",
      tags: ["Contract-Transactions"],
      operationId: "getContractSubscriptionsTransactionReceiptsByTimestamp",
      querystring: requestQuerySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
      hide: true,
      deprecated: true,
    },
    handler: async (request, reply) => {
      const { contractAddresses, fromBlockTimestamp, toBlockTimestamp } =
        request.query;

      const receipts = await getReceiptsByTimestamp({
        addresses: parseArrayString(contractAddresses),
        fromTimestamp: fromBlockTimestamp,
        toTimestamp: toBlockTimestamp,
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
