import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getActiveClaimCondition } from "thirdweb/extensions/erc20";
import { getContractV5 } from "../../../../../../utils/cache/getContractV5";
import { claimConditionOutputSchema } from "../../../../../schemas/claimConditions";
import {
  contractParamSchema,
  standardResponseSchema,
} from "../../../../../schemas/sharedApiSchemas";
import { getChainIdFromChain } from "../../../../../utils/chain";

// INPUT
const requestSchema = contractParamSchema;

// OUTPUT
const responseSchema = Type.Object({
  result: claimConditionOutputSchema,
});

// LOGIC
export async function erc20GetActiveClaimConditions(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof responseSchema>;
  }>({
    method: "GET",
    url: "/contract/:chain/:contractAddress/erc20/claim-conditions/get-active",
    schema: {
      summary: "Retrieve the currently active claim phase, if any.",
      description: "Retrieve the currently active claim phase, if any.",
      tags: ["ERC20"],
      operationId: "getActiveClaimConditions",
      params: requestSchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain, contractAddress } = request.params;

      const chainId = await getChainIdFromChain(chain);
      const contract = await getContractV5({
        chainId,
        contractAddress,
      });
      const returnData = await getActiveClaimCondition({ contract });
      reply.status(StatusCodes.OK).send({
        result: {
          pricePerToken: returnData.pricePerToken.toString(),
          metadata: returnData.metadata,
          maxClaimableSupply: returnData.maxClaimableSupply.toString(),
          quantityLimitPerWallet: returnData.quantityLimitPerWallet.toString(),
          merkleRoot: returnData.merkleRoot,
          currency: returnData.currency,
          startTimestamp: returnData.startTimestamp.toString(),
          supplyClaimed: returnData.supplyClaimed.toString(),
        },
      });
    },
  });
}
