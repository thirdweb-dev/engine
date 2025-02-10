import { Type, type Static } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getConfiguration } from "../../../../shared/db/configuration/get-configuration.js";
import { getEventLogsByCursor } from "../../../../shared/db/contract-event-logs/get-contract-event-logs.js";
import { AddressSchema } from "../../../schemas/address.js";
import { eventLogSchema, toEventLogSchema } from "../../../schemas/event-log.js";
import { standardResponseSchema } from "../../../schemas/shared-api-schemas.js";

const requestQuerySchema = Type.Object({
  cursor: Type.Optional(Type.String()),
  pageSize: Type.Optional(Type.Integer({ minimum: 1 })),
  topics: Type.Optional(Type.Array(Type.String())),
  contractAddresses: Type.Optional(Type.Array(AddressSchema)),
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
      hide: true,
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
