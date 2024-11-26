import { type Static, Type } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getContract } from "../../../../../../utils/cache/getContract";
import { AddressSchema } from "../../../../../schemas/address";
import { claimerProofSchema } from "../../../../../schemas/claimConditions";
import {
  contractParamSchema,
  standardResponseSchema,
} from "../../../../../schemas/sharedApiSchemas";
import { getChainIdFromChain } from "../../../../../utils/chain";

// INPUT
const requestSchema = contractParamSchema;
const requestQueryString = Type.Object({
  tokenId: Type.Union([Type.String(), Type.Integer()], {
    description:
      "The token ID of the NFT you want to get the claimer proofs for.",
  }),
  walletAddress: {
    ...AddressSchema,
    description: "The wallet address to get the merkle proofs for.",
  },
});

// OUTPUT
const responseSchema = Type.Object({
  result: claimerProofSchema,
});

// LOGIC
export async function erc1155GetClaimerProofs(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof responseSchema>;
    Querystring: Static<typeof requestQueryString>;
  }>({
    method: "GET",
    url: "/contract/:chain/:contractAddress/erc1155/claim-conditions/get-claimer-proofs",
    schema: {
      summary: "Get claimer proofs",
      description:
        "Returns allowlist information and merkle proofs for a given wallet address. Returns null if no proof is found for the given wallet address.",
      tags: ["ERC1155"],
      operationId: "erc1155-getClaimerProofs",
      params: requestSchema,
      querystring: requestQueryString,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain, contractAddress } = request.params;
      const { tokenId, walletAddress } = request.query;

      const chainId = await getChainIdFromChain(chain);
      const contract = await getContract({
        chainId,
        contractAddress,
      });
      const returnData =
        await contract.erc1155.claimConditions.getClaimerProofs(
          tokenId,
          walletAddress,
        );
      reply.status(StatusCodes.OK).send({
        result: returnData,
      });
    },
  });
}
