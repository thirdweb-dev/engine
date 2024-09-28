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
  tokenId: Type.Union([Type.String(), Type.Number()], {
    description: "The token ID of the NFT you want to claim.",
  }),
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
export async function erc1155GetActiveClaimConditions(
  fastify: FastifyInstance,
) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof responseSchema>;
    Querystring: Static<typeof requestQueryString>;
  }>({
    method: "GET",
    url: "/contract/:chain/:contractAddress/erc1155/claim-conditions/get-active",
    schema: {
      summary: "Get currently active claim phase for a specific token ID.",
      description:
        "Retrieve the currently active claim phase for a specific token ID, if any.",
      tags: ["ERC1155"],
      operationId: "erc1155-getActiveClaimConditions",
      params: requestSchema,
      querystring: requestQueryString,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain, contractAddress } = request.params;
      const { tokenId, withAllowList } = request.query;

      const chainId = await getChainIdFromChain(chain);
      const contract = await getContract({
        chainId,
        contractAddress,
      });
      const returnData = await contract.erc1155.claimConditions.getActive(
        tokenId,
        {
          withAllowList,
        },
      );
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
