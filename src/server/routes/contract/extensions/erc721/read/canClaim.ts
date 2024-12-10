import { Type, type Static } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getContract } from "../../../../../../shared/utils/cache/get-contract";
import {
  contractParamSchema,
  standardResponseSchema,
} from "../../../../../schemas/sharedApiSchemas";
import { getChainIdFromChain } from "../../../../../utils/chain";

// INPUT
const requestSchema = contractParamSchema;
const requestQueryString = Type.Object({
  quantity: Type.String({
    description: "The amount of tokens to claim.",
  }),
  addressToCheck: Type.Optional(
    Type.String({
      description:
        "The wallet address to check if it can claim tokens. This considers all aspects of the active claim phase, including allowlists, previous claims, etc.",
      examples: ["0x1946267d81Fb8aDeeEa28e6B98bcD446c8248473"],
    }),
  ),
});

// OUTPUT
const responseSchema = Type.Object({
  result: Type.Boolean(),
});

// LOGIC
export async function erc721CanClaim(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof responseSchema>;
    Querystring: Static<typeof requestQueryString>;
  }>({
    method: "GET",
    url: "/contract/:chain/:contractAddress/erc721/claim-conditions/can-claim",
    schema: {
      summary: "Check if tokens are available for claiming",
      description:
        "Check if tokens are currently available for claiming, optionally specifying if a specific wallet address can claim.",
      tags: ["ERC721"],
      operationId: "erc721-canClaim",
      params: requestSchema,
      querystring: requestQueryString,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain, contractAddress } = request.params;
      const { quantity, addressToCheck } = request.query;

      const chainId = await getChainIdFromChain(chain);
      const contract = await getContract({
        chainId,
        contractAddress,
      });
      const returnData = await contract.erc721.claimConditions.canClaim(
        quantity,
        addressToCheck,
      );
      reply.status(StatusCodes.OK).send({
        result: returnData,
      });
    },
  });
}
