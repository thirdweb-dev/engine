import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getContract } from "../../../../utils/cache/getContract";
import { abiEventSchema } from "../../../schemas/contract";
import {
  requestParamSchema,
  standardResponseSchema,
} from "../../../schemas/sharedApiSchemas";
import { getChainIdFromChain } from "../../../utils/chain";

const requestSchema = requestParamSchema;

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
      operationId: "getEvents",
      params: requestSchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain, contractAddress, simulateTx } = request.params;

      const chainId = await getChainIdFromChain(chain);
      const contract = await getContract({
        chainId,
        contractAddress,
      });

      let returnData = await contract.publishedMetadata.extractEvents();

      reply.status(StatusCodes.OK).send({
        result: returnData,
      });
    },
  });
}
