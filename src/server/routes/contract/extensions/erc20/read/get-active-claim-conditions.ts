import { Type, type Static } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getContract } from "../../../../../../shared/utils/cache/get-contract.js";
import { claimConditionOutputSchema } from "../../../../../schemas/claim-conditions/index.js";
import {
  contractParamSchema,
  standardResponseSchema,
} from "../../../../../schemas/shared-api-schemas.js";
import { getChainIdFromChain } from "../../../../../utils/chain.js";

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
export async function erc20GetActiveClaimConditions(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof responseSchema>;
    Querystring: Static<typeof requestQueryString>;
  }>({
    method: "GET",
    url: "/contract/:chain/:contractAddress/erc20/claim-conditions/get-active",
    schema: {
      summary: "Retrieve the currently active claim phase, if any.",
      description: "Retrieve the currently active claim phase, if any.",
      tags: ["ERC20"],
      operationId: "erc20-getActiveClaimConditions",
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
      const returnData = await contract.erc20.claimConditions.getActive({
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
