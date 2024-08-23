import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getCurrencyMetadata } from "thirdweb/extensions/erc20";
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
      operationId: "get",
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
      const currencyMetadata = await getCurrencyMetadata({ contract });
      reply.status(StatusCodes.OK).send({
        result: {
          symbol: currencyMetadata.symbol,
          name: currencyMetadata.name,
          decimals: currencyMetadata.decimals.toString(),
        },
      });
    },
  });
}
