import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getContract } from "../../../../../../utils/cache/getContract";
import { claimConditionInputSchema } from "../../../../../schemas/claimConditions";
import {
  contractParamSchema,
  standardResponseSchema,
} from "../../../../../schemas/sharedApiSchemas";
import { getChainIdFromChain } from "../../../../../utils/chain";

// INPUT
const requestSchema = contractParamSchema;
const requestBodySchema = Type.Object({
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

// OUPUT
const responseSchema = Type.Object({
  result: claimConditionInputSchema,
});

// LOGIC
export async function erc1155GetActiveClaimConditions(
  fastify: FastifyInstance,
) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof responseSchema>;
    Body: Static<typeof requestBodySchema>;
  }>({
    method: "POST",
    url: "/contract/:chain/:contractAddress/erc1155/claim-conditions/get-active",
    schema: {
      summary: "Get currently active claim phase for a specific token ID.",
      description:
        "Retrieve the currently active claim phase for a specific token ID, if any.",
      tags: ["ERC1155"],
      operationId: "getActiveClaimConditions",
      params: requestSchema,
      body: requestBodySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain, contractAddress } = request.params;
      const { tokenId, withAllowList } = request.body;

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
        },
      });
    },
  });
}
