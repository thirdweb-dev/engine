import { Type, type Static } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getContract } from "../../../../../../utils/cache/getContract";
import { claimConditionOutputSchema } from "../../../../../schemas/claimConditions";
import {
  contractParamSchema,
  standardResponseSchema,
} from "../../../../../schemas/sharedApiSchemas";
import { getChainIdFromChain } from "../../../../../utils/chain";

// INPUT
const requestSchema = contractParamSchema;
const requestQueryString = Type.Object({
  withAllowList: Type.Optional(
    Type.Boolean({
      description:
        "Provide a boolean value to include the allowlist in the response.",
    }),
  ),
});

// OUTPUT
const responseSchema = Type.Object({
  result: claimConditionOutputSchema,
});

// LOGIC
export async function erc721GetActiveClaimConditions(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof responseSchema>;
    Querystring: Static<typeof requestQueryString>;
  }>({
    method: "GET",
    url: "/contract/:chain/:contractAddress/erc721/claim-conditions/get-active",
    schema: {
      summary: "Retrieve the currently active claim phase, if any.",
      description: "Retrieve the currently active claim phase, if any.",
      tags: ["ERC721"],
      operationId: "erc721-getActiveClaimConditions",
      params: requestSchema,
      querystring: requestQueryString,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain, contractAddress } = request.params;
      const { withAllowList } = request.query;

      const chainId = await getChainIdFromChain(chain);
      const contract = await getContract({
        chainId,
        contractAddress,
      });
      const returnData = await contract.erc721.claimConditions.getActive({
        withAllowList,
      });
      reply.status(StatusCodes.OK).send({
        result: {
          ...returnData,
          price: returnData.price.toString(),
          waitInSeconds: returnData.waitInSeconds.toString(),
          currencyMetadata: {
            ...returnData.currencyMetadata,
            value: returnData.currencyMetadata.value.toString(),
          },
          startTime: returnData.startTime.toISOString(),
        },
      });
    },
  });
}
