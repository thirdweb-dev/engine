import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getContractEventLogsByBlockAndTopics } from "../../../../db/contractEventLogs/getContractEventLogs";
import { isContractSubscribed } from "../../../../db/contractSubscriptions/getContractSubscriptions";
import { createCustomError } from "../../../middleware/error";
import {
  contractParamSchema,
  standardResponseSchema,
} from "../../../schemas/sharedApiSchemas";
import { getChainIdFromChain } from "../../../utils/chain";

const requestQuerySchema = Type.Object({
  fromBlock: Type.Number(),
  toBlock: Type.Optional(Type.Number()),
  topics: Type.Optional(Type.Array(Type.String())),
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

export async function getContractEventLogs(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof contractParamSchema>;
    Reply: Static<typeof responseSchema>;
    Querystring: Static<typeof requestQuerySchema>;
  }>({
    method: "GET",
    url: "/contract/:chain/:contractAddress/events/get-logs",
    schema: {
      summary: "Get contract event logs",
      description: "Get event logs for a subscribed contract",
      tags: ["Contract", "Index"],
      operationId: "read",
      params: contractParamSchema,
      querystring: requestQuerySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain, contractAddress } = request.params;
      const { fromBlock, toBlock, topics } = request.query;

      const standardizedContractAddress = contractAddress.toLowerCase();

      const chainId = await getChainIdFromChain(chain);

      // check if subscribed, if not tell user to subscribe
      const isSubscribed = await isContractSubscribed({
        chainId,
        contractAddress: standardizedContractAddress,
      });

      if (!isSubscribed) {
        const subcriptionUrl = `/contract/${chain}/${contractAddress}/events/subscribe`;
        throw createCustomError(
          `Contract is not subscribed to! To subscribe, please use ${subcriptionUrl}`,
          StatusCodes.NOT_FOUND,
          "NOT_FOUND",
        );
      }

      const resultLogs = await getContractEventLogsByBlockAndTopics({
        chainId,
        contractAddress: standardizedContractAddress,
        fromBlock,
        toBlock,
        topics,
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
