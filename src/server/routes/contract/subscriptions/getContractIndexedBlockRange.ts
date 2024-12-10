import { Type, type Static } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getContractEventLogsIndexedBlockRange } from "../../../../shared/db/contractEventLogs/get-contract-event-logs";
import { createCustomError } from "../../../middleware/error";
import { AddressSchema } from "../../../schemas/address";
import { chainIdOrSlugSchema } from "../../../schemas/chain";
import {
  contractParamSchema,
  standardResponseSchema,
} from "../../../schemas/sharedApiSchemas";
import { getChainIdFromChain } from "../../../utils/chain";

const responseSchema = Type.Object({
  result: Type.Object({
    chain: chainIdOrSlugSchema,
    contractAddress: AddressSchema,
    fromBlock: Type.Integer(),
    toBlock: Type.Integer(),
    status: Type.String(),
  }),
});

responseSchema.example = {
  result: {
    chain: "ethereum",
    contractAddress: "0x....",
    fromBlock: 100,
    toBlock: 200,
    status: "success",
  },
};

export async function getContractIndexedBlockRange(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof contractParamSchema>;
    Reply: Static<typeof responseSchema>;
  }>({
    method: "GET",
    url: "/contract/:chain/:contractAddress/subscriptions/get-indexed-blocks",
    schema: {
      summary: "Get subscribed contract indexed block range",
      description: "Gets the subscribed contract's indexed block range",
      tags: ["Contract-Subscriptions"],
      operationId: "getContractIndexedBlockRange",
      params: contractParamSchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain, contractAddress } = request.params;
      const standardizedContractAddress = contractAddress.toLowerCase();

      const chainId = await getChainIdFromChain(chain);

      const result = await getContractEventLogsIndexedBlockRange({
        chainId,
        contractAddress: standardizedContractAddress,
      });

      if (!result.fromBlock || !result.toBlock) {
        const error = createCustomError(
          `No logs found for chainId: ${chainId}, contractAddress: ${standardizedContractAddress}`,
          StatusCodes.NOT_FOUND,
          "LOG_NOT_FOUND",
        );
        throw error;
      }

      reply.status(StatusCodes.OK).send({
        result: {
          chain,
          contractAddress: standardizedContractAddress,
          fromBlock: result.fromBlock,
          toBlock: result.toBlock,
          status: "success",
        },
      });
    },
  });
}
