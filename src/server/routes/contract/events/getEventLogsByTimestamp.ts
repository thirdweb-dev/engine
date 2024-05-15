import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getEventLogsByBlockTimestamp } from "../../../../db/contractEventLogs/getContractEventLogs";
import { eventLogSchema } from "../../../schemas/eventLog";
import { standardResponseSchema } from "../../../schemas/sharedApiSchemas";

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
        [log.topic0, log.topic1, log.topic2, log.topic3].forEach((val) => {
          if (val) {
            topics.push(val);
          }
        });

        return {
          chainId: log.chainId,
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
