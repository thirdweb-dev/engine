import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getNFT } from "thirdweb/extensions/erc721";
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
  tokenId: Type.String({
    description: "The tokenId of the NFT to retrieve",
    examples: ["0"],
  }),
});

// OUPUT
const responseSchema = Type.Object({
  result: v5NFTSchema,
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
    url: "/contract/:chain/:contractAddress/erc721/get",
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
      const { chain, contractAddress } = request.params;
      const { tokenId } = request.query;
      const chainId = await getChainIdFromChain(chain);
      const contract = await getContractV5({
        chainId,
        contractAddress,
      });
      const nftData = await getNFT({
        contract,
        tokenId: BigInt(tokenId),
        includeOwner: true,
      });
      const result = convertBigIntToString(nftData) as Static<
        typeof v5NFTSchema
      >;
      reply.status(StatusCodes.OK).send({
        result,
      });
    },
  });
}
