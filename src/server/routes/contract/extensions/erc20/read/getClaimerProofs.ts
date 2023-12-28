import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getContract } from "../../../../../../utils/cache/getContract";
import { claimerProofSchema } from "../../../../../schemas/claimConditions";
import {
  contractParamSchema,
  standardResponseSchema,
} from "../../../../../schemas/sharedApiSchemas";
import { getChainIdFromChain } from "../../../../../utils/chain";

// INPUT
const requestSchema = contractParamSchema;
const requestBodySchema = Type.Object({
  walletAddress: Type.String({
    description: "The wallet address to get the merkle proofs for.",
  }),
});

// OUPUT
const responseSchema = Type.Object({
  result: claimerProofSchema,
});

// LOGIC
export async function erc20GetClaimerProofs(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof responseSchema>;
    Body: Static<typeof requestBodySchema>;
  }>({
    method: "POST",
    url: "/contract/:chain/:contractAddress/erc20/claim-conditions/get-claimer-proofs",
    schema: {
      summary: "Get claimer proofs",
      description:
        "Returns allowlist information and merkle proofs for a given wallet address. Returns null if no proof is found for the given wallet address.",
      tags: ["ERC20"],
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
      const returnData = await contract.erc20.claimConditions.getClaimerProofs(
        walletAddress,
      );
      reply.status(StatusCodes.OK).send({
        result: returnData,
      });
    },
  });
}
