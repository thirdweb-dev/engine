import { ContractEventLogs } from "@prisma/client";
import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getConfiguration } from "../../../../db/configuration/getConfiguration";
import {
  getEventLogsByBlock,
  getEventLogsByCursor,
  getEventLogsByTimestamp,
} from "../../../../db/contractEventLogs/getContractEventLogs";
import { parseArrayString } from "../../../../utils/url";
import { createCustomError } from "../../../middleware/error";
import { eventLogSchema, toEventLogSchema } from "../../../schemas/eventLog";
import { standardResponseSchema } from "../../../schemas/sharedApiSchemas";

const MAX_ALLOWED_QUERY_BLOCKS = 100;

const requestQuerySchema = Type.Intersect([
  Type.Object({
    chainId: Type.String(),
    addresses: Type.String({
      description: "A list of contract addresses (comma-separated).",
    }),
    topics: Type.Optional(
      Type.String({
        description: "A list of topics to filter by (comma-separated).",
      }),
    ),
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
    logs: Type.Array(eventLogSchema),
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

export async function getContractSubscriptionsEventLogs(
  fastify: FastifyInstance,
) {
  fastify.route<{
    Reply: Static<typeof responseSchema>;
    Querystring: Static<typeof requestQuerySchema>;
  }>({
    method: "GET",
    url: "/contract/subscriptions/logs",
    schema: {
      summary: "Get event logs",
      description: "Get event logs for one or more contract subscriptions.",
      tags: ["Contract-Subscriptions"],
      operationId: "getContractSubscriptionsEventLogs",
      querystring: requestQuerySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
      hide: true,
      deprecated: true,
    },
    handler: async (request, reply) => {
      const {
        chainId,
        addresses: addressesRaw,
        topics: topicsRaw,
        queryType,
      } = request.query;

      const addresses = parseArrayString(addressesRaw);
      const topics = parseArrayString(topicsRaw);

      // Query by cursor.
      if (queryType === "cursor") {
        const { limit, cursor } = request.query;

        const { cursor: newCursor, logs } = await getLogsByCursor({
          limit,
          cursor,
          addresses,
          topics,
        });

        return reply.status(StatusCodes.OK).send({
          result: {
            cursor: newCursor,
            logs: logs.map(toEventLogSchema),
          },
        });
      }

      // Query by block range.
      if (queryType === "block") {
        const { fromBlock, toBlock } = request.query;

        const logs = await getLogsByBlock({
          chainId,
          addresses,
          fromBlock,
          toBlock,
          topics,
        });

        return reply.status(StatusCodes.OK).send({
          result: {
            logs: logs.map(toEventLogSchema),
          },
        });
      }

      // Query by timestamp range.
      if (queryType === "timestamp") {
        const { fromTimestamp, toTimestamp } = request.query;

        const logs = await getLogsByTimestamp({
          addresses,
          fromTimestamp,
          toTimestamp,
          topics,
        });

        return reply.status(StatusCodes.OK).send({
          result: {
            logs: logs.map(toEventLogSchema),
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

export const getLogsByCursor = async (args: {
  addresses: string[];
  limit: number;
  cursor?: string;
  topics?: string[];
}): Promise<{ cursor?: string; logs: ContractEventLogs[] }> => {
  const { addresses, cursor, limit, topics } = args;

  // Add lag behind to account for clock skew, concurrent writes, etc.
  const config = await getConfiguration();
  const maxCreatedAt = new Date(Date.now() - config.cursorDelaySeconds * 1000);

  return await getEventLogsByCursor({
    contractAddresses: addresses,
    limit,
    cursor,
    topics,
    maxCreatedAt,
  });
};

export const getLogsByBlock = async (args: {
  chainId: string;
  addresses: string[];
  fromBlock: number;
  toBlock?: number;
  topics?: string[];
}): Promise<ContractEventLogs[]> => {
  const { chainId, addresses, fromBlock, toBlock, topics } = args;

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

  return await getEventLogsByBlock({
    chainId: parseInt(chainId),
    contractAddresses: addresses,
    fromBlock,
    toBlock,
    topics,
  });
};

export const getLogsByTimestamp = async (args: {
  addresses: string[];
  fromTimestamp: number;
  toTimestamp?: number;
  topics?: string[];
}): Promise<ContractEventLogs[]> => {
  const { addresses, fromTimestamp, toTimestamp, topics } = args;

  return await getEventLogsByTimestamp({
    contractAddresses: addresses,
    fromTimestamp,
    toTimestamp,
    topics,
  });
};
