import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getContractLogsByBlockAndTopics } from "../../../../db/contractLogs/getContractLogs";
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
    chain: Type.String(),
    contractAddress: Type.String(),
    logs: Type.Array(
      Type.Object({
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

export async function getLogs(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof contractParamSchema>;
    Reply: Static<typeof responseSchema>;
    Querystring: Static<typeof requestQuerySchema>;
  }>({
    method: "GET",
    url: "/contract/:chain/:contractAddress/indexer/getLogs",
    schema: {
      summary: "Get latest indexed block",
      description: "Get last indexed block for the contract",
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

      const chainId = await getChainIdFromChain(chain);

      const results = await getContractLogsByBlockAndTopics({
        chainId,
        contractAddress,
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
          chain,
          contractAddress,
          logs,
          status: "success",
        },
      });
    },
  });
}
