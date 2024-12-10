import { Type, type Static } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getConfiguration } from "../../../../shared/db/configuration/get-configuration";
import { getTransactionReceiptsByCursor } from "../../../../shared/db/contractTransactionReceipts/get-contract-transaction-receipts";
import { AddressSchema } from "../../../schemas/address";
import { standardResponseSchema } from "../../../schemas/sharedApiSchemas";
import {
  toTransactionReceiptSchema,
  transactionReceiptSchema,
} from "../../../schemas/transactionReceipt";

/* Consider moving all cursor logic inside db file */

const requestQuerySchema = Type.Object({
  cursor: Type.Optional(Type.String()),
  pageSize: Type.Optional(Type.Integer({ minimum: 1 })),
  contractAddresses: Type.Optional(Type.Array(AddressSchema)),
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

export async function pageTransactionReceipts(fastify: FastifyInstance) {
  fastify.route<{
    Reply: Static<typeof responseSchema>;
    Querystring: Static<typeof requestQuerySchema>;
  }>({
    method: "GET",
    url: "/contract/transactions/paginate-receipts",
    schema: {
      summary:
        "Get contract paginated transaction receipts for subscribed contract",
      description:
        "Get contract paginated transaction receipts for subscribed contract",
      tags: ["Contract-Transactions"],
      operationId: "pageTransactionReceipts",
      querystring: requestQuerySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
      hide: true,
    },
    handler: async (request, reply) => {
      const { cursor, pageSize, contractAddresses } = request.query;

      const standardizedContractAddresses = contractAddresses?.map((val) =>
        val.toLowerCase(),
      );

      // add lag behind to account for clock skew, concurrent writes, etc
      const config = await getConfiguration();
      const maxCreatedAt = new Date(
        Date.now() - config.cursorDelaySeconds * 1000,
      );

      const { cursor: newCursor, transactionReceipts } =
        await getTransactionReceiptsByCursor({
          cursor,
          limit: pageSize,
          contractAddresses: standardizedContractAddresses,
          maxCreatedAt,
        });

      reply.status(StatusCodes.OK).send({
        result: {
          cursor: newCursor,
          receipts: transactionReceipts.map(toTransactionReceiptSchema),
          status: "success",
        },
      });
    },
  });
}
