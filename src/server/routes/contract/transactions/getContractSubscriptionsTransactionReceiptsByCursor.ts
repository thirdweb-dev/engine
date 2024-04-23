import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getTransactionReceiptsByCursor } from "../../../../db/contractTransactionReceipts/getContractTransactionReceipts";
import { parseArrayString } from "../../../../utils/url";
import { standardResponseSchema } from "../../../schemas/sharedApiSchemas";
import {
  toTransactionReceiptSchema,
  transactionReceiptSchema,
} from "../../../schemas/transactionReceipt";

/* Consider moving all cursor logic inside db file */

const requestQuerySchema = Type.Object({
  cursor: Type.Optional(Type.String()),
  pageSize: Type.Optional(Type.Number()),
  contractAddresses: Type.Optional(Type.Array(Type.String())),
});

const responseSchema = Type.Object({
  result: Type.Object({
    cursor: Type.Optional(Type.String()),
    receipts: Type.Array(transactionReceiptSchema),
    status: Type.String(),
  }),
});

responseSchema.example = {
  result: {
    cursor: "abcd-xyz",
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

export async function getContractSubscriptionsTransactionReceiptsByCursor(
  fastify: FastifyInstance,
) {
  fastify.route<{
    Reply: Static<typeof responseSchema>;
    Querystring: Static<typeof requestQuerySchema>;
  }>({
    method: "GET",
    url: "/contract/transactions/paginate-receipts",
    schema: {
      summary: "Get transaction receipts by cursor",
      description:
        "(Deprecated) Get transaction receipts for a contract subscription by cursor.",
      tags: ["Contract-Transactions"],
      operationId: "getContractSubscriptionsTransactionReceiptsByCursor",
      querystring: requestQuerySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
      hide: true,
      deprecated: true,
    },
    handler: async (request, reply) => {
      const { cursor, pageSize, contractAddresses } = request.query;

      const { cursor: newCursor, receipts } =
        await getTransactionReceiptsByCursor({
          addresses: parseArrayString(contractAddresses),
          limit: pageSize ?? 100,
          cursor,
        });

      reply.status(StatusCodes.OK).send({
        result: {
          cursor: newCursor,
          receipts: receipts.map(toTransactionReceiptSchema),
          status: "success",
        },
      });
    },
  });
}
