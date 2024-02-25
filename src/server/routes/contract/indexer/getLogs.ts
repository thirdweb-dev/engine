import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getLogsByBlockAndTopics } from "../../../../db/contractLogs/getContractLogs";
import { standardResponseSchema } from "../../../schemas/sharedApiSchemas";

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

export async function getLogsRoute(fastify: FastifyInstance) {
  fastify.route<{
    Reply: Static<typeof responseSchema>;
    Querystring: Static<typeof requestQuerySchema>;
  }>({
    method: "GET",
    url: "/contract/indexer/getLogs",
    schema: {
      summary: "Get contract logs",
      description: "Get indexed contract logs",
      tags: ["Contract", "Index"],
      operationId: "read",
      querystring: requestQuerySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      const { fromBlock, toBlock, topics } = request.query;

      const results = await getLogsByBlockAndTopics({
        fromBlock,
        toBlock,
        topics,
      });

      const logs = results.map((log) => {
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
