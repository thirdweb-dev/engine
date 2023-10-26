import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import {
  contractParamSchema,
  standardResponseSchema,
} from "../../../../../helpers/sharedApiSchemas";
import { nftSchema } from "../../../../../schemas/nft";
import { getChainIdFromChain } from "../../../../../utilities/chain";
import { getContract } from "../../../../../utils/cache/getContract";

// INPUT
const requestSchema = contractParamSchema;
const querystringSchema = Type.Object({
  token_id: Type.String({
    description: "The tokenId of the NFT to retrieve",
    examples: ["0"],
  }),
});

// OUPUT
const responseSchema = Type.Object({
  result: nftSchema,
});

responseSchema.example = [
  {
    result: {
      metadata: {
        id: "2",
        uri: "ipfs://QmWDdRcLqVMzFeawADAPr2EFCzdqCzx373VpWK3Kfx25GJ/0",
        name: "My NFT",
        description: "My NFT description",
        image: "ipfs://QmciR3WLJsf2BgzTSjbG5zCxsrEQ8PqsHK7JWGWsDSNo46/nft.png",
      },
      owner: "0x3EcDBF3B911d0e9052b64850693888b008e18373",
      type: "ERC721",
      supply: "1",
    },
  },
];

// LOGIC
export async function erc721Get(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof responseSchema>;
    Querystring: Static<typeof querystringSchema>;
  }>({
    method: "GET",
    url: "/contract/:chain/:contract_address/erc721/get",
    schema: {
      summary: "Get details",
      description: "Get the details for a token in an ERC-721 contract.",
      tags: ["ERC721"],
      operationId: "get",
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
      const result = await contract.erc721.get(token_id);
      reply.status(StatusCodes.OK).send({
        result,
      });
    },
  });
}
