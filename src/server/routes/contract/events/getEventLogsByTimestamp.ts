import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getEventLogsByBlockTimestamp } from "../../../../db/contractEventLogs/getContractEventLogs";
import {
  eventLogsSchema,
  standardResponseSchema,
} from "../../../schemas/sharedApiSchemas";

const requestQuerySchema = Type.Object({
  contractAddresses: Type.Optional(Type.Array(Type.String())),
  topics: Type.Optional(Type.Array(Type.String())),
  fromBlockTimestamp: Type.Number(),
  toBlockTimestamp: Type.Optional(Type.Number()),
});

const responseSchema = Type.Object({
  result: Type.Object({
    logs: eventLogsSchema,
    status: Type.String(),
  }),
});

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
