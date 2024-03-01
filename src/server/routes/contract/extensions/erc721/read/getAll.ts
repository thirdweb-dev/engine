import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getNFTs } from "thirdweb/extensions/erc721";
import { getContractV5 } from "../../../../../../utils/cache/getContractV5";
import { v5NFTSchema } from "../../../../../schemas/nft";
import {
  contractParamSchema,
  standardResponseSchema,
} from "../../../../../schemas/sharedApiSchemas";
import { getChainIdFromChain } from "../../../../../utils/chain";
import { convertBigIntToString } from "../../../../../utils/convertor";

// INPUT
const requestSchema = contractParamSchema;
const querystringSchema = Type.Object({
  start: Type.Optional(
    Type.Number({
      description: "The start token id for paginated results. Defaults to 0.",
      examples: ["0"],
    }),
  ),
  count: Type.Optional(
    Type.Number({
      description: "The page count for paginated results. Defaults to 100.",
      examples: ["20"],
    }),
  ),
});

// OUPUT
const responseSchema = Type.Object({
  result: Type.Array(v5NFTSchema),
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
      operationId: "getAll",
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
      const contract = await getContractV5({
        chainId,
        contractAddress,
      });
      const nftData = await getNFTs({
        contract,
        start,
        count,
      });
      const result = nftData.map(
        (nft) => convertBigIntToString(nft) as Static<typeof v5NFTSchema>,
      );

      reply.status(StatusCodes.OK).send({
        result,
      });
    },
  });
}
