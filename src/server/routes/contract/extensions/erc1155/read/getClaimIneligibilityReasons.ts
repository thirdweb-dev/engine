import { Static, Type } from "@sinclair/typebox";
import { ClaimEligibility } from "@thirdweb-dev/sdk";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getContract } from "../../../../../../utils/cache/getContract";
import {
  contractParamSchema,
  standardResponseSchema,
} from "../../../../../schemas/sharedApiSchemas";
import { getChainIdFromChain } from "../../../../../utils/chain";

// INPUT
const requestSchema = contractParamSchema;
const requestQueryString = Type.Object({
  tokenId: Type.Union([Type.String(), Type.Number()], {
    description:
      "The token ID of the NFT you want to check if the wallet address can claim.",
  }),
  quantity: Type.String({
    description: "The amount of tokens to claim.",
  }),
  addressToCheck: Type.Optional(
    Type.String({
      description: "The wallet address to check if it can claim tokens.",
      examples: ["0x1946267d81Fb8aDeeEa28e6B98bcD446c8248473"],
    }),
  ),
});

// OUTPUT
const responseSchema = Type.Object({
  result: Type.Array(Type.Union([Type.String(), Type.Enum(ClaimEligibility)])),
});

// LOGIC
export async function erc1155GetClaimIneligibilityReasons(
  fastify: FastifyInstance,
) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof responseSchema>;
    Querystring: Static<typeof requestQueryString>;
  }>({
    method: "POST",
    url: "/contract/:chain/:contractAddress/erc1155/claim-conditions/get-claim-ineligibility-reasons",
    schema: {
      summary: "Get claim ineligibility reasons",
      description:
        "Get an array of reasons why a specific wallet address is not eligible to claim tokens, if any.",
      tags: ["ERC1155"],
      operationId: "getClaimIneligibilityReasons",
      params: requestSchema,
      querystring: requestQueryString,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain, contractAddress } = request.params;
      const { quantity, tokenId, addressToCheck } = request.query;

      const chainId = await getChainIdFromChain(chain);
      const contract = await getContract({
        chainId,
        contractAddress,
      });
      const returnData =
        await contract.erc1155.claimConditions.getClaimIneligibilityReasons(
          tokenId,
          quantity,
          addressToCheck,
        );
      reply.status(StatusCodes.OK).send({
        result: returnData,
      });
    },
  });
}
