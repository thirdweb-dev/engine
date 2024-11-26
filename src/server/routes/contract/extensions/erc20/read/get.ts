import { type Static, Type } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getContract } from "../../../../../../utils/cache/getContract";
import {
  erc20ContractParamSchema,
  standardResponseSchema,
} from "../../../../../schemas/sharedApiSchemas";
import { getChainIdFromChain } from "../../../../../utils/chain";

// INPUT
const requestSchema = erc20ContractParamSchema;

// OUTPUT
const responseSchema = Type.Object({
  result: Type.Object({
    name: Type.String(),
    symbol: Type.String(),
    decimals: Type.String(),
  }),
});

responseSchema.example = {
  result: {
    name: "ERC20",
    symbol: "",
    decimals: "18",
  },
};

// LOGIC
export async function erc20GetMetadata(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof responseSchema>;
  }>({
    method: "GET",
    url: "/contract/:chain/:contractAddress/erc20/get",
    schema: {
      summary: "Get token details",
      description: "Get details for this ERC-20 contract.",
      tags: ["ERC20"],
      operationId: "erc20-get",
      params: requestSchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain, contractAddress } = request.params;
      const chainId = await getChainIdFromChain(chain);
      const contract = await getContract({
        chainId,
        contractAddress,
      });
      const returnData: any = await contract.erc20.get();
      reply.status(StatusCodes.OK).send({
        result: {
          symbol: returnData.symbol,
          name: returnData.name,
          decimals: returnData.decimals,
        },
      });
    },
  });
}
