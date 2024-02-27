import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import {
  getEventLogsByBlockTimestamp,
  getEventLogsByCreationTimestamp,
} from "../../../../db/contractEventLogs/getContractEventLogs";
import { createCustomError } from "../../../middleware/error";
import { standardResponseSchema } from "../../../schemas/sharedApiSchemas";

const requestQuerySchema = Type.Object({
  contractAddresses: Type.Optional(Type.Array(Type.String())),
  topics: Type.Optional(Type.Array(Type.String())),
  fromCreationTimestamp: Type.Optional(Type.Number()),
  toCreationTimestamp: Type.Optional(Type.Number()),
  fromBlockTimestamp: Type.Optional(Type.Number()),
  toBlockTimestamp: Type.Optional(Type.Number()),
});

const responseSchema = Type.Object({
  result: Type.Object({
    logs: Type.Array(
      Type.Object({
        chainId: Type.Number(),
        contractAddress: Type.String(),
        blockNumber: Type.Number(),
        transactionHash: Type.String(),
        topics: Type.Array(Type.String()),
        data: Type.String(),
        eventName: Type.Optional(Type.String()),
        decodedLog: Type.Any(),
        timestamp: Type.Number(),
        transactionIndex: Type.Number(),
        logIndex: Type.Number(),
      }),
    ),
    status: Type.String(),
  }),
});

responseSchema.example = {
  result: {
    chain: "ethereum",
    contractAddress: "0x....",
    firstIndexedBlock: 100,
    lastIndexedBlock: 200,
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
      summary: "Get contract event logs",
      description: "Get event logs for a subscribed contract",
      tags: ["Contract", "Index"],
      operationId: "read",
      querystring: requestQuerySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    preValidation: async (request) => {
      const {
        fromCreationTimestamp,
        toCreationTimestamp,
        fromBlockTimestamp,
        toBlockTimestamp,
      } = request.query;

      const hasCreatedTimestamps =
        fromCreationTimestamp !== undefined ||
        toCreationTimestamp !== undefined;
      const hasBlockTimestamps =
        fromBlockTimestamp !== undefined || toBlockTimestamp !== undefined;

      if (hasCreatedTimestamps == hasBlockTimestamps) {
        throw createCustomError(
          "Either blockTimestamp or createdTimestamp should be defined",
          StatusCodes.BAD_REQUEST,
          "BAD_REQUEST",
        );
      }
    },
    handler: async (request, reply) => {
      const {
        fromCreationTimestamp,
        toCreationTimestamp,
        fromBlockTimestamp,
        toBlockTimestamp,
        contractAddresses,
        topics,
      } = request.query;

      const standardizedContractAddresses = contractAddresses?.map((val) =>
        val.toLowerCase(),
      );

      let resultLogs;
      if (fromCreationTimestamp) {
        resultLogs = await getEventLogsByCreationTimestamp({
          fromCreationTimestamp,
          toCreationTimestamp,
          contractAddresses: standardizedContractAddresses,
          topics,
        });
      } else if (fromBlockTimestamp) {
        resultLogs = await getEventLogsByBlockTimestamp({
          fromBlockTimestamp,
          toBlockTimestamp,
          contractAddresses: standardizedContractAddresses,
          topics,
        });
      } else {
        throw createCustomError(
          "Either blockTimestamp or createdTimestamp should be defined",
          StatusCodes.BAD_REQUEST,
          "BAD_REQUEST",
        );
      }

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
