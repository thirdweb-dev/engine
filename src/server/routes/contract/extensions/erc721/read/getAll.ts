import { Type, type Static } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getContract } from "../../../../../../utils/cache/getContract";
import { nftSchema } from "../../../../../schemas/nft";
import {
  contractParamSchema,
  standardResponseSchema,
} from "../../../../../schemas/sharedApiSchemas";
import { getChainIdFromChain } from "../../../../../utils/chain";

// INPUT
const requestSchema = contractParamSchema;
const querystringSchema = Type.Object({
  start: Type.Optional(
    Type.Integer({
      description: "The start token id for paginated results. Defaults to 0.",
      minimum: 0,
    }),
  ),
  count: Type.Optional(
    Type.Integer({
      description: "The page count for paginated results. Defaults to 100.",
      minimum: 1,
    }),
  ),
});

// OUTPUT
const responseSchema = Type.Object({
  result: Type.Array(nftSchema),
});

responseSchema.example = {
  result: [
    {
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
  ],
};

// LOGIC
export async function erc721GetAll(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof responseSchema>;
    Querystring: Static<typeof querystringSchema>;
  }>({
    method: "GET",
    url: "/contract/:chain/:contractAddress/erc721/get-all",
    schema: {
      summary: "Get all details",
      description: "Get details for all tokens in an ERC-721 contract.",
      tags: ["ERC721"],
      operationId: "erc721-getAll",
      params: requestSchema,
      querystring: querystringSchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain, contractAddress } = request.params;
      const { start, count } = request.query;
      const chainId = await getChainIdFromChain(chain);
      const contract = await getContract({
        chainId,
        contractAddress,
      });
      const result = await contract.erc721.getAll({
        start,
        count,
      });
      reply.status(StatusCodes.OK).send({
        result,
      });
    },
  });
}
