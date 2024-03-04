import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { totalSupply } from "thirdweb/extensions/erc1155";
import { getContractV5 } from "../../../../../../utils/cache/getContractV5";
import {
  erc1155ContractParamSchema,
  standardResponseSchema,
} from "../../../../../schemas/sharedApiSchemas";
import { getChainIdFromChain } from "../../../../../utils/chain";

// INPUT
const requestSchema = erc1155ContractParamSchema;
const querystringSchema = Type.Object({
  tokenId: Type.String({
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
    url: "/contract/:chain/:contractAddress/erc1155/total-supply",
    schema: {
      summary: "Get total supply",
      description:
        "Get the total supply in circulation for this ERC-1155 contract.",
      tags: ["ERC1155"],
      operationId: "totalSupply",
      params: requestSchema,
      querystring: querystringSchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain, contractAddress } = request.params;
      const { tokenId } = request.query;
      const chainId = await getChainIdFromChain(chain);
      const contract = await getContractV5({
        chainId,
        contractAddress,
      });
      const returnData = await totalSupply({
        contract,
        tokenId: BigInt(tokenId),
      });
      reply.status(StatusCodes.OK).send({
        result: returnData.toString(),
      });
    },
  });
}
