import { ContractTransactionReceipts } from "@prisma/client";
import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getConfiguration } from "../../../../db/configuration/getConfiguration";
import {
  getTransactionReceiptsByBlock,
  getTransactionReceiptsByCursor,
  getTransactionReceiptsByTimestamp,
} from "../../../../db/contractTransactionReceipts/getContractTransactionReceipts";
import { parseArrayString } from "../../../../utils/url";
import { createCustomError } from "../../../middleware/error";
import { standardResponseSchema } from "../../../schemas/sharedApiSchemas";
import {
  toTransactionReceiptSchema,
  transactionReceiptSchema,
} from "../../../schemas/transactionReceipt";

const MAX_ALLOWED_QUERY_BLOCKS = 100;

const requestQuerySchema = Type.Intersect([
  Type.Object({
    chainId: Type.String(),
    addresses: Type.String({
      description: "A list of contract addresses (comma-separated).",
    }),
  }),
  Type.Union([
    Type.Object({
      queryType: Type.Literal("cursor"),
      cursor: Type.Optional(Type.String()),
      limit: Type.Number(),
    }),
    Type.Object({
      queryType: Type.Literal("block"),
      fromBlock: Type.Number(),
      toBlock: Type.Optional(Type.Number()),
    }),
    Type.Object({
      queryType: Type.Literal("timestamp"),
      fromTimestamp: Type.Number({
        description: "A timestamp in seconds",
      }),
      toTimestamp: Type.Optional(
        Type.Number({
          description: "A timestamp in seconds",
        }),
      ),
    }),
  ]),
]);

const responseSchema = Type.Object({
  result: Type.Object({
    cursor: Type.Optional(
      Type.String({
        description: "Only returned if using the 'cursor' queryType.",
      }),
    ),
    receipts: Type.Array(transactionReceiptSchema),
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
  },
};

export async function getContractSubscriptionsTransactionReceipts(
  fastify: FastifyInstance,
) {
  fastify.route<{
    Reply: Static<typeof responseSchema>;
    Querystring: Static<typeof requestQuerySchema>;
  }>({
    method: "GET",
    url: "/contract/subscriptions/receipts",
    schema: {
      summary: "Get transaction receipts",
      description:
        "Get transaction receipts for one or more contract subscriptions.",
      tags: ["Contract-Subscriptions"],
      operationId: "getContractSubscriptionsTransactionReceipts",
      querystring: requestQuerySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
      hide: true,
      deprecated: true,
    },
    handler: async (request, reply) => {
      const { chainId, addresses: addressesRaw, queryType } = request.query;

      const addresses = parseArrayString(addressesRaw);

      // Query by cursor.
      if (queryType === "cursor") {
        const { limit, cursor } = request.query;

        const { cursor: newCursor, receipts } = await getReceiptsByCursor({
          limit,
          cursor,
          addresses,
        });

        return reply.status(StatusCodes.OK).send({
          result: {
            cursor: newCursor,
            receipts: receipts.map(toTransactionReceiptSchema),
          },
        });
      }

      // Query by block range.
      if (queryType === "block") {
        const { fromBlock, toBlock } = request.query;

        const receipts = await getReceiptsByBlock({
          chainId,
          addresses,
          fromBlock,
          toBlock,
        });

        return reply.status(StatusCodes.OK).send({
          result: {
            receipts: receipts.map(toTransactionReceiptSchema),
          },
        });
      }

      // Query by timestamp range.
      if (queryType === "timestamp") {
        const { fromTimestamp, toTimestamp } = request.query;

        const receipts = await getReceiptsByTimestamp({
          addresses,
          fromTimestamp,
          toTimestamp,
        });

        return reply.status(StatusCodes.OK).send({
          result: {
            receipts: receipts.map(toTransactionReceiptSchema),
          },
        });
      }

      throw createCustomError(
        'Invalid "queryType"',
        StatusCodes.BAD_REQUEST,
        "BAD_REQUEST",
      );
    },
  });
}

export const getReceiptsByCursor = async (args: {
  addresses: string[];
  limit: number;
  cursor?: string;
}): Promise<{ cursor?: string; receipts: ContractTransactionReceipts[] }> => {
  const { addresses, cursor, limit } = args;

  // Add lag behind to account for clock skew, concurrent writes, etc.
  const config = await getConfiguration();
  const maxCreatedAt = new Date(Date.now() - config.cursorDelaySeconds * 1000);

  return await getTransactionReceiptsByCursor({
    addresses,
    limit,
    cursor,
    maxCreatedAt,
  });
};

export const getReceiptsByBlock = async (args: {
  chainId: string;
  addresses: string[];
  fromBlock: number;
  toBlock?: number;
}): Promise<ContractTransactionReceipts[]> => {
  const { chainId, addresses, fromBlock, toBlock } = args;

  if (toBlock) {
    if (toBlock < fromBlock) {
      throw createCustomError(
        "toBlock is lower than fromBlock",
        StatusCodes.BAD_REQUEST,
        "BAD_REQUEST",
      );
    }

    if (toBlock - fromBlock > MAX_ALLOWED_QUERY_BLOCKS) {
      throw createCustomError(
        `Cannot query more than ${MAX_ALLOWED_QUERY_BLOCKS}`,
        StatusCodes.BAD_REQUEST,
        "BAD_REQUEST",
      );
    }
  }

  return await getTransactionReceiptsByBlock({
    chainId: parseInt(chainId),
    addresses,
    fromBlock,
    toBlock,
  });
};

export const getReceiptsByTimestamp = async (args: {
  addresses: string[];
  fromTimestamp: number;
  toTimestamp?: number;
}): Promise<ContractTransactionReceipts[]> => {
  const { addresses, fromTimestamp, toTimestamp } = args;

  return await getTransactionReceiptsByTimestamp({
    addresses,
    fromTimestamp,
    toTimestamp,
  });
};
