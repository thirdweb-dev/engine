import { Type, type Static } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getContract } from "../../../../shared/utils/cache/get-contract";
import { abiEventSchema } from "../../../schemas/contract";
import {
  contractParamSchema,
  standardResponseSchema,
} from "../../../schemas/shared-api-schemas";
import { getChainIdFromChain } from "../../../utils/chain";

const requestSchema = contractParamSchema;

// OUTPUT
const responseSchema = Type.Object({
  result: Type.Array(abiEventSchema),
});

responseSchema.example = {
  result: [
    {
      name: "Approval",
      inputs: [
        {
          type: "address",
          name: "owner",
        },
        {
          type: "address",
          name: "approved",
        },
        {
          type: "uint256",
          name: "tokenId",
        },
      ],
      outputs: [],
    },
    {
      name: "ApprovalForAll",
      inputs: [
        {
          type: "address",
          name: "owner",
        },
        {
          type: "address",
          name: "operator",
        },
        {
          type: "bool",
          name: "approved",
        },
      ],
      outputs: [],
    },
  ],
};

export async function extractEvents(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof responseSchema>;
  }>({
    method: "GET",
    url: "/contract/:chain/:contractAddress/metadata/events",
    schema: {
      summary: "Get events",
      description: "Get details of all events implemented by a contract.",
      tags: ["Contract-Metadata"],
      operationId: "getContractEvents",
      params: requestSchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain, contractAddress } = request.params;

      const chainId = await getChainIdFromChain(chain);
      const contract = await getContract({
        chainId,
        contractAddress,
      });

      const returnData = await contract.publishedMetadata.extractEvents();

      reply.status(StatusCodes.OK).send({
        result: returnData,
      });
    },
  });
}
