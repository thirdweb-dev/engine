import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { eventLogSchema, toEventLogSchema } from "../../../schemas/eventLog";
import {
  contractParamSchema,
  standardResponseSchema,
} from "../../../schemas/sharedApiSchemas";
import { getChainIdFromChain } from "../../../utils/chain";
import { getLogsByBlock } from "../subscriptions/getEventLogs";

const requestQuerySchema = Type.Object({
  fromBlock: Type.Number(),
  toBlock: Type.Optional(Type.Number()),
  topics: Type.Optional(Type.Array(Type.String())),
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

export async function getContractSubscriptionsEventLogsByBlock(
  fastify: FastifyInstance,
) {
  fastify.route<{
    Params: Static<typeof contractParamSchema>;
    Reply: Static<typeof responseSchema>;
    Querystring: Static<typeof requestQuerySchema>;
  }>({
    method: "GET",
    url: "/contract/:chain/:contractAddress/events/get-logs",
    schema: {
      summary: "Get event logs by block",
      description:
        "(Deprecated) Get event logs for a contract subscription by block range.",
      tags: ["Contract-Events"],
      operationId: "getContractSubscriptionsEventLogsByBlock",
      params: contractParamSchema,
      querystring: requestQuerySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
      hide: true,
      deprecated: true,
    },
    handler: async (request, reply) => {
      const { chain, contractAddress } = request.params;
      const { fromBlock, toBlock, topics } = request.query;

      const chainId = await getChainIdFromChain(chain);

      const logs = await getLogsByBlock({
        chainId: chainId.toString(),
        addresses: [contractAddress.toLowerCase()],
        fromBlock,
        toBlock,
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
