import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { parseArrayString } from "../../../../utils/url";
import { eventLogSchema, toEventLogSchema } from "../../../schemas/eventLog";
import { standardResponseSchema } from "../../../schemas/sharedApiSchemas";
import { getLogsByTimestamp } from "../subscriptions/getEventLogs";

const requestQuerySchema = Type.Object({
  contractAddresses: Type.Optional(Type.Array(Type.String())),
  topics: Type.Optional(Type.Array(Type.String())),
  fromBlockTimestamp: Type.Number(),
  toBlockTimestamp: Type.Optional(Type.Number()),
});

const responseSchema = Type.Object({
  result: Type.Object({
    logs: Type.Array(eventLogSchema),
    status: Type.String(),
  }),
});

responseSchema.example = {
  result: {
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

export async function getContractSubscriptionsEventLogsByTimestamp(
  fastify: FastifyInstance,
) {
  fastify.route<{
    Reply: Static<typeof responseSchema>;
    Querystring: Static<typeof requestQuerySchema>;
  }>({
    method: "GET",
    url: "/contract/events/get-logs",
    schema: {
      summary: "Get event logs by timestamp",
      description:
        "(Deprecated) Get event logs for a contract subscription by timestamp range.",
      tags: ["Contract-Events"],
      operationId: "getContractSubscriptionsEventLogsByTimestamp",
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
        contractAddresses,
        topics,
        fromBlockTimestamp,
        toBlockTimestamp,
      } = request.query;

      const logs = await getLogsByTimestamp({
        fromTimestamp: fromBlockTimestamp,
        toTimestamp: toBlockTimestamp,
        addresses: parseArrayString(contractAddresses),
        topics,
      });

      reply.status(StatusCodes.OK).send({
        result: {
          logs: logs.map(toEventLogSchema),
          status: "success",
        },
      });
    },
  });
}
