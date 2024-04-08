import { Static, Type } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { totalSupply } from "thirdweb/extensions/erc20";
import { getContractV5 } from "../../../../../../utils/cache/getContractV5";
import {
  erc20ContractParamSchema,
  standardResponseSchema,
} from "../../../../../schemas/sharedApiSchemas";
import { getChainIdFromChain } from "../../../../../utils/chain";

// INPUT
const requestSchema = erc20ContractParamSchema;

// OUTPUT
const responseSchema = Type.Object({
  result: Type.String({
    description: "The total supply of the ERC-20 contract",
  }),
});

responseSchema.example = [
  {
    result: "10000000000000000000",
  },
];

// LOGIC
export async function erc20TotalSupply(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof responseSchema>;
  }>({
    method: "GET",
    url: "/contract/:chain/:contractAddress/erc20/total-supply",
    schema: {
      summary: "Get total supply",
      description:
        "Get the total supply in circulation for this ERC-20 contract.",
      tags: ["ERC20"],
      operationId: "totalSupply",
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
      const returnData = await totalSupply({
        contract,
      });

      reply.status(StatusCodes.OK).send({
        ...(Value.Convert(responseSchema, { result: returnData }) as Static<
          typeof responseSchema
        >),
      });
    },
  });
}
