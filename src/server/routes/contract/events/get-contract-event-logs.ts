import { Type, type Static } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getContractEventLogsByBlockAndTopics } from "../../../../shared/db/contract-event-logs/get-contract-event-logs";
import { isContractSubscribed } from "../../../../shared/db/contract-subscriptions/get-contract-subscriptions";
import { createCustomError } from "../../../middleware/error";
import { AddressSchema, TransactionHashSchema } from "../../../schemas/address";
import {
  contractParamSchema,
  standardResponseSchema,
} from "../../../schemas/shared-api-schemas";
import { getChainIdFromChain } from "../../../utils/chain";

const requestQuerySchema = Type.Object({
  fromBlock: Type.Integer({ minimum: 0 }),
  toBlock: Type.Optional(Type.Integer({ minimum: 0 })),
  topics: Type.Optional(Type.Array(Type.String())),
});

const responseSchema = Type.Object({
  result: Type.Object({
    logs: Type.Array(
      Type.Object({
        chainId: Type.Integer(),
        contractAddress: AddressSchema,
        blockNumber: Type.Integer(),
        transactionHash: TransactionHashSchema,
        topics: Type.Array(Type.String()),
        data: Type.String(),
        eventName: Type.Optional(Type.String()),
        decodedLog: Type.Any(),
        timestamp: Type.Integer(),
        transactionIndex: Type.Integer(),
        logIndex: Type.Integer(),
      }),
    ),
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

// TODO: throw this into config
const MAX_ALLOWED_QUERY_BLOCKS = 100;

export async function getContractEventLogs(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof contractParamSchema>;
    Reply: Static<typeof responseSchema>;
    Querystring: Static<typeof requestQuerySchema>;
  }>({
    method: "GET",
    url: "/contract/:chain/:contractAddress/events/get-logs",
    schema: {
      summary: "Get subscribed contract event logs",
      description: "Get event logs for a subscribed contract",
      tags: ["Contract-Events"],
      operationId: "getContractEventLogs",
      params: contractParamSchema,
      querystring: requestQuerySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
      hide: true,
    },
    handler: async (request, reply) => {
      const { chain, contractAddress } = request.params;
      const { fromBlock, toBlock, topics } = request.query;

      if (toBlock && toBlock < fromBlock) {
        throw createCustomError(
          "toBlock cannot be less than fromBlock",
          StatusCodes.BAD_REQUEST,
          "BAD_REQUEST",
        );
      }

      if (toBlock && toBlock - fromBlock > MAX_ALLOWED_QUERY_BLOCKS) {
        throw createCustomError(
          `cannot query more than ${MAX_ALLOWED_QUERY_BLOCKS}`,
          StatusCodes.BAD_REQUEST,
          "BAD_REQUEST",
        );
      }

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
