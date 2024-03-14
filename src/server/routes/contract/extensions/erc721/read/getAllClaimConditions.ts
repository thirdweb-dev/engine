import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
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
  result: Type.Array(claimConditionOutputSchema),
});

// LOGIC
export async function erc721GetAllClaimConditions(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof responseSchema>;
    Querystring: Static<typeof requestQueryString>;
  }>({
    method: "GET",
    url: "/contract/:chain/:contractAddress/erc721/claim-conditions/get-all",
    schema: {
      summary: "Get all the claim phases configured for the drop.",
      description: "Get all the claim phases configured for the drop.",
      tags: ["ERC721"],
      operationId: "getAllClaimConditions",
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
      const returnData = await contract.erc721.claimConditions.getAll({
        withAllowList,
      });

      const sanitizedReturnData = returnData.map((item) => {
        return {
          ...item,
          price: item.price.toString(),
          waitInSeconds: item.waitInSeconds.toString(),
          currencyMetadata: {
            ...item.currencyMetadata,
            value: item.currencyMetadata.value.toString(),
          },
          startTime: item.startTime.toISOString(),
        };
      });

      reply.status(StatusCodes.OK).send({
        result: sanitizedReturnData,
      });
    },
  });
}
