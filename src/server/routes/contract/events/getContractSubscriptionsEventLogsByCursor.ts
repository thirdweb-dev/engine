import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { parseArrayString } from "../../../../utils/url";
import { eventLogSchema, toEventLogSchema } from "../../../schemas/eventLog";
import { standardResponseSchema } from "../../../schemas/sharedApiSchemas";
import { getLogsByCursor } from "../subscriptions/getEventLogs";

const requestQuerySchema = Type.Object({
  cursor: Type.Optional(Type.String()),
  pageSize: Type.Optional(Type.Number()),
  topics: Type.Optional(Type.Array(Type.String())),
  contractAddresses: Type.Optional(Type.Array(Type.String())),
});

const responseSchema = Type.Object({
  result: Type.Object({
    cursor: Type.Optional(Type.String()),
    logs: Type.Array(eventLogSchema),
    status: Type.String(),
  }),
});

responseSchema.example = {
  result: {
    cursor: "abcd-xyz",
    logs: [
      {
        chainId: 1,
        contractAddress: "0x....",
        blockNumber: 1,
        transactionHash: "0x...",
        topics: ["0x..."],
        data: "0x...",
        eventName: "TransferFrom",
        decodedLog: {
          from: {
            type: "address",
            value: "0x...",
          },
          to: {
            type: "address",
            value: "0x...",
          },
          value: {
            type: "uint256",
            value: "1000",
          },
        },
        timestamp: 100,
        transactionIndex: 1,
        logIndex: 1,
      },
    ],
    status: "success",
  },
};

export async function getContractSubscriptionsEventLogsByCursor(
  fastify: FastifyInstance,
) {
  fastify.route<{
    Reply: Static<typeof responseSchema>;
    Querystring: Static<typeof requestQuerySchema>;
  }>({
    method: "GET",
    url: "/contract/events/paginate-logs",
    schema: {
      summary: "Get event logs by cursor",
      description:
        "(Deprecated) Get event logs for a contract subscription by cursor.",
      tags: ["Contract-Events"],
      operationId: "getContractSubscriptionsEventLogsByCursor",
      querystring: requestQuerySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
      hide: true,
      deprecated: true,
    },
    handler: async (request, reply) => {
      const { cursor, pageSize, topics, contractAddresses } = request.query;

      const { cursor: newCursor, logs } = await getLogsByCursor({
        limit: pageSize ?? 100,
        cursor,
        addresses: parseArrayString(contractAddresses),
        topics,
      });

      reply.status(StatusCodes.OK).send({
        result: {
          cursor: newCursor,
          logs: logs.map(toEventLogSchema),
          status: "success",
        },
      });
    },
  });
}
