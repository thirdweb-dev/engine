import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import {
  erc20ContractParamSchema,
  standardResponseSchema,
} from "../../../../../helpers/sharedApiSchemas";
import { getChainIdFromChain } from "../../../../../utilities/chain";
import { getContract } from "../../../../../utils/cache/getContract";

// INPUT
const requestSchema = erc20ContractParamSchema;

// OUPUT
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
    url: "/contract/:chain/:contract_address/erc20/get",
    schema: {
      summary: "Get token details",
      description: "Get details for this ERC-20 contract.",
      tags: ["ERC20"],
      operationId: "get",
      params: requestSchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain, contract_address } = request.params;
      const chainId = getChainIdFromChain(chain);
      const contract = await getContract({
        chainId,
        contractAddress: contract_address,
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
