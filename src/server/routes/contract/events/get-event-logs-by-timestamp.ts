import { Type, type Static } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getEventLogsByBlockTimestamp } from "../../../../shared/db/contract-event-logs/get-contract-event-logs";
import { AddressSchema } from "../../../schemas/address";
import { eventLogSchema } from "../../../schemas/event-log";
import { standardResponseSchema } from "../../../schemas/shared-api-schemas";

const requestQuerySchema = Type.Object({
  contractAddresses: Type.Optional(Type.Array(AddressSchema)),
  topics: Type.Optional(Type.Array(Type.String())),
  fromBlockTimestamp: Type.Integer({ minimum: 0 }),
  toBlockTimestamp: Type.Optional(Type.Integer({ minimum: 0 })),
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

export async function getEventLogs(fastify: FastifyInstance) {
  fastify.route<{
    Reply: Static<typeof responseSchema>;
    Querystring: Static<typeof requestQuerySchema>;
  }>({
    method: "GET",
    url: "/contract/events/get-logs",
    schema: {
      summary: "Get subscribed contract event logs",
      description: "Get event logs for a subscribed contract",
      tags: ["Contract-Events"],
      operationId: "getEventLogs",
      querystring: requestQuerySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
      hide: true,
    },
    handler: async (request, reply) => {
      const {
        contractAddresses,
        topics,
        fromBlockTimestamp,
        toBlockTimestamp,
      } = request.query;

      const standardizedContractAddresses = contractAddresses?.map((val) =>
        val.toLowerCase(),
      );

      const resultLogs = await getEventLogsByBlockTimestamp({
        fromBlockTimestamp: fromBlockTimestamp,
        toBlockTimestamp: toBlockTimestamp,
        contractAddresses: standardizedContractAddresses,
        topics: topics,
      });

      const logs = resultLogs.map((log) => {
        const topics: string[] = [];
        for (const val of [ log.topic0, log.topic1, log.topic2, log.topic3 ]) {
          if (val) {
            topics.push(val);
          }
        }

        return {
          chainId: Number.parseInt(log.chainId),
          contractAddress: log.contractAddress,
          blockNumber: log.blockNumber,
          transactionHash: log.transactionHash,
          topics,
          data: log.data,
          eventName: log.eventName ?? undefined,
          decodedLog: log.decodedLog,
          timestamp: log.timestamp.getTime(),
          transactionIndex: log.transactionIndex,
          logIndex: log.logIndex,
        };
      });

      reply.status(StatusCodes.OK).send({
        result: {
          logs,
          status: "success",
        },
      });
    },
  });
}
