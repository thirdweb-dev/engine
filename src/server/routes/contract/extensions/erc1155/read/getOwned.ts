import { type Static, Type } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getContract } from "../../../../../../utils/cache/getContract";
import { AddressSchema } from "../../../../../schemas/address";
import { nftSchema } from "../../../../../schemas/nft";
import {
  erc1155ContractParamSchema,
  standardResponseSchema,
} from "../../../../../schemas/sharedApiSchemas";
import { getChainIdFromChain } from "../../../../../utils/chain";

// INPUT
const requestSchema = erc1155ContractParamSchema;
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

responseSchema.examples = [
  {
    result: [
      {
        metadata: {
          id: "0",
          uri: "ipfs://QmciR3WLJsf2BgzTSjbG5zCxsrEQ8PqsHK7JWGWsDSNo46/nft.png",
          name: "TJ-Origin",
          description: "Origin",
          external_url: "",
          attributes: [
            {
              trait_type: "Mode",
              value: "GOD",
            },
          ],
        },
        owner: "0x1946267d81Fb8aDeeEa28e6B98bcD446c8248473",
        type: "ERC1155",
        supply:
          "600000150000000000000000000000000000000000009000000000000000000000712",
        quantityOwned: "9000000000000000000000000",
      },
    ],
  },
];

// LOGIC
export async function erc1155GetOwned(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof responseSchema>;
    Querystring: Static<typeof querystringSchema>;
  }>({
    method: "GET",
    url: "/contract/:chain/:contractAddress/erc1155/get-owned",
    schema: {
      summary: "Get owned tokens",
      description:
        "Get all tokens in an ERC-1155 contract owned by a specific wallet.",
      tags: ["ERC1155"],
      operationId: "erc1155-getOwned",
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
      const result = await contract.erc1155.getOwned(walletAddress);
      reply.status(StatusCodes.OK).send({
        result,
      });
    },
  });
}
