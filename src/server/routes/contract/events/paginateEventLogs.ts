import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getConfiguration } from "../../../../db/configuration/getConfiguration";
import { getEventLogsByCursor } from "../../../../db/contractEventLogs/getContractEventLogs";
import { eventLogSchema, toEventLogSchema } from "../../../schemas/eventLog";
import { standardResponseSchema } from "../../../schemas/sharedApiSchemas";

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

export async function pageEventLogs(fastify: FastifyInstance) {
  fastify.route<{
    Reply: Static<typeof responseSchema>;
    Querystring: Static<typeof requestQuerySchema>;
  }>({
    method: "GET",
    url: "/contract/events/paginate-logs",
    schema: {
      summary: "Get contract paginated event logs for subscribed contract",
      description: "Get contract paginated event logs for subscribed contract",
      tags: ["Contract-Events"],
      operationId: "pageEventLogs",
      querystring: requestQuerySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      const { cursor, pageSize, topics, contractAddresses } = request.query;

      const standardizedContractAddresses = contractAddresses?.map((val) =>
        val.toLowerCase(),
      );

      // add lag behind to account for clock skew, concurrent writes, etc
      const config = await getConfiguration();
      const maxCreatedAt = new Date(
        Date.now() - config.cursorDelaySeconds * 1000,
      );

      const { cursor: newCursor, logs } = await getEventLogsByCursor({
        cursor,
        limit: pageSize,
        topics,
        contractAddresses: standardizedContractAddresses,
        maxCreatedAt,
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
