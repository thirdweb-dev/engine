import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getContract } from "../../../../../../../utils/cache/getContract";
import {
  contractParamSchema,
  standardResponseSchema,
} from "../../../../../../schemas/sharedApiSchemas";
import { getChainIdFromChain } from "../../../../../../utils/chain";

// INPUT
const requestSchema = contractParamSchema;
const requestBodySchema = Type.Object({
  walletAddress: Type.String({
    description: "The wallet address to get the merkle proofs for.",
  }),
});

// OUPUT
const responseSchema = Type.Object({
  result: Type.Union([
    Type.Null(),
    Type.Object({
      price: Type.Optional(Type.String()),
      currencyAddress: Type.Optional(Type.String()),
      address: Type.String(),
      maxClaimable: Type.String(),
      proof: Type.Array(Type.String()),
    }),
  ]),
});

// LOGIC
export async function erc721ClaimConditionsGetClaimerProofs(
  fastify: FastifyInstance,
) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof responseSchema>;
    Body: Static<typeof requestBodySchema>;
  }>({
    method: "POST",
    url: "/contract/:chain/:contractAddress/erc721/claim-conditions/get-claimer-proofs",
    schema: {
      summary: "Get claimer proofs",
      description:
        "Returns allowlist information and merkle proofs for a given wallet address. Returns null if no proof is found for the given wallet address.",
      tags: ["ERC721"],
      operationId: "claimConditionsGetClaimerProofs",
      params: requestSchema,
      querystring: requestBodySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain, contractAddress } = request.params;
      const { walletAddress } = request.body;

      const chainId = await getChainIdFromChain(chain);
      const contract = await getContract({
        chainId,
        contractAddress,
      });
      const returnData = await contract.erc721.claimConditions.getClaimerProofs(
        walletAddress,
      );
      reply.status(StatusCodes.OK).send({
        result: returnData,
      });
    },
  });
}
