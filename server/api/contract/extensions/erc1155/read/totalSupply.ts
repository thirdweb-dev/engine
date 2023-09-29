import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import {
  erc1155ContractParamSchema,
  standardResponseSchema,
} from "../../../../../helpers/sharedApiSchemas";
import { getChainIdFromChain } from "../../../../../utilities/chain";
import { getContract } from "../../../../../utils/cache/getContract";

// INPUT
const requestSchema = erc1155ContractParamSchema;
const querystringSchema = Type.Object({
  token_id: Type.String({
    description: "The tokenId of the NFT to retrieve",
    examples: ["0"],
  }),
});

// OUPUT
const responseSchema = Type.Object({
  result: Type.Optional(Type.String()),
});

responseSchema.example = [
  {
    result: "100000000",
  },
];

// LOGIC
export async function erc1155TotalSupply(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof responseSchema>;
    Querystring: Static<typeof querystringSchema>;
  }>({
    method: "GET",
    url: "/contract/:chain/:contract_address/erc1155/total-supply",
    schema: {
      summary: "Get total supply",
      description:
        "Get the total supply in circulation for this ERC-1155 contract.",
      tags: ["ERC1155"],
      operationId: "erc1155_totalSupply",
      params: requestSchema,
      querystring: querystringSchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain, contract_address } = request.params;
      const { token_id } = request.query;
      const chainId = getChainIdFromChain(chain);
      const contract = await getContract({
        chainId,
        contractAddress: contract_address,
      });
      const returnData = await contract.erc1155.totalSupply(token_id);
      reply.status(StatusCodes.OK).send({
        result: returnData.toString(),
      });
    },
  });
}
