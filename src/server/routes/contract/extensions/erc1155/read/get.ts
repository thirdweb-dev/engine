import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getContract } from "../../../../../../utils/cache/getContract";
import { nftSchema } from "../../../../../schemas/nft";
import {
  erc1155ContractParamSchema,
  standardResponseSchema,
} from "../../../../../schemas/sharedApiSchemas";
import { getChainIdFromChain } from "../../../../../utils/chain";

// INPUT
const requestSchema = erc1155ContractParamSchema;

// QUERY
const querystringSchema = Type.Object({
  tokenId: Type.String({
    description: "The tokenId of the NFT to retrieve",
    examples: ["0"],
  }),
});

// OUPUT
const responseSchema = Type.Object({
  result: nftSchema,
});

responseSchema.examples = [
  {
    result: {
      metadata: {
        id: "0",
        uri: "ipfs://QmdaWX1GEwnFW4NooYRej5BQybKNLdxkWtMwyw8KiWRueS/0",
        name: "My Edition NFT",
        description: "My Edition NFT description",
        image: "ipfs://QmciR3WLJsf2BgzTSjbG5zCxsrEQ8PqsHK7JWGWsDSNo46/nft.png",
      },
      owner: "0xE79ee09bD47F4F5381dbbACaCff2040f2FbC5803",
      type: "ERC1155",
      supply: "100",
      quantityOwned: "100",
    },
  },
];

// LOGIC
export async function erc1155Get(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof responseSchema>;
    Querystring: Static<typeof querystringSchema>;
  }>({
    method: "GET",
    url: "/contract/:chain/:contractAddress/erc1155/get",
    schema: {
      summary: "Get details",
      description: "Get the details for a token in an ERC-1155 contract.",
      tags: ["ERC1155"],
      operationId: "get",
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
      const contract = await getContract({
        chainId,
        contractAddress,
      });
      const result = await contract.erc1155.get(tokenId);
      reply.status(StatusCodes.OK).send({
        result,
      });
    },
  });
}
