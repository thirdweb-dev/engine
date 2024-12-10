import { Type, type Static } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getContract } from "../../../../../../shared/utils/cache/get-contract";
import { AddressSchema } from "../../../../../schemas/address";
import { nftSchema } from "../../../../../schemas/nft";
import {
  contractParamSchema,
  standardResponseSchema,
} from "../../../../../schemas/sharedApiSchemas";
import { getChainIdFromChain } from "../../../../../utils/chain";

// INPUT
const requestSchema = contractParamSchema;
const querystringSchema = Type.Object({
  walletAddress: {
    ...AddressSchema,
    description: "Address of the wallet to get NFTs for",
  },
});

// OUTPUT
const responseSchema = Type.Object({
  result: Type.Array(nftSchema),
});

responseSchema.example = [
  {
    result: [
      {
        metadata: {
          id: "2",
          uri: "ipfs://QmWDdRcLqVMzFeawADAPr2EFCzdqCzx373VpWK3Kfx25GJ/0",
          name: "My NFT",
          description: "My NFT description",
          image:
            "ipfs://QmciR3WLJsf2BgzTSjbG5zCxsrEQ8PqsHK7JWGWsDSNo46/nft.png",
        },
        owner: "0x3EcDBF3B911d0e9052b64850693888b008e18373",
        type: "ERC721",
        supply: "1",
      },
    ],
  },
];

// LOGIC
export async function erc721GetOwned(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof responseSchema>;
    Querystring: Static<typeof querystringSchema>;
  }>({
    method: "GET",
    url: "/contract/:chain/:contractAddress/erc721/get-owned",
    schema: {
      summary: "Get owned tokens",
      description:
        "Get all tokens in an ERC-721 contract owned by a specific wallet.",
      tags: ["ERC721"],
      operationId: "erc721-getOwned",
      params: requestSchema,
      querystring: querystringSchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain, contractAddress } = request.params;
      const { walletAddress } = request.query;
      const chainId = await getChainIdFromChain(chain);
      const contract = await getContract({
        chainId,
        contractAddress,
      });
      // Check if the wallet has any tokens before querying getOwned
      const balance = await contract.erc721.balanceOf(walletAddress);
      if (balance.eq(0)) {
        reply.status(StatusCodes.OK).send({
          result: [],
        });
        return;
      }
      const result = await contract.erc721.getOwned(walletAddress);
      reply.status(StatusCodes.OK).send({
        result,
      });
    },
  });
}
