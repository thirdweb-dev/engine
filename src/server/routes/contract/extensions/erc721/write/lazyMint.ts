import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { queueTx } from "../../../../../../db/transactions/queueTx";
import { getContract } from "../../../../../../utils/cache/getContract";
import { nftOrInputSchema } from "../../../../../schemas/nft";
import {
  requestParamSchema,
  standardResponseSchema,
  transactionWritesResponseSchema,
} from "../../../../../schemas/sharedApiSchemas";
import { walletAuthSchema } from "../../../../../schemas/wallet";
import { txOverridesForWriteRequest } from "../../../../../schemas/web3api-overrides";
import { getChainIdFromChain } from "../../../../../utils/chain";

// INPUTS
const requestSchema = requestParamSchema;
const requestBodySchema = Type.Object({
  metadatas: Type.Array(nftOrInputSchema),
  ...txOverridesForWriteRequest.properties,
});

requestBodySchema.examples = [
  {
    metadata: [
      {
        name: "My NFT #1",
        description: "My NFT #1 description",
        image: "ipfs://QmciR3WLJsf2BgzTSjbG5zCxsrEQ8PqsHK7JWGWsDSNo46/nft.png",
      },
      {
        name: "My NFT #2",
        description: "My NFT #2 description",
        image: "ipfs://QmciR3WLJsf2BgzTSjbG5zCxsrEQ8PqsHK7JWGWsDSNo46/nft.png",
      },
    ],
  },
];

export async function erc721lazyMint(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof transactionWritesResponseSchema>;
    Body: Static<typeof requestBodySchema>;
  }>({
    method: "POST",
    url: "/contract/:chain/:contractAddress/erc721/lazy-mint",
    schema: {
      summary: "Lazy mint",
      description: "Lazy mint ERC-721 tokens to be claimed in the future.",
      tags: ["ERC721"],
      operationId: "lazyMint",
      params: requestSchema,
      body: requestBodySchema,
      headers: walletAuthSchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: transactionWritesResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain, contractAddress, simulateTx } = request.params;
      const { metadatas } = request.body;
      const walletAddress = request.headers[
        "x-backend-wallet-address"
      ] as string;
      const accountAddress = request.headers["x-account-address"] as string;
      const chainId = await getChainIdFromChain(chain);
      const contract = await getContract({
        chainId,
        contractAddress,
        walletAddress,
        accountAddress,
      });

      const tx = await contract.erc721.lazyMint.prepare(metadatas);
      const queueId = await queueTx({
        tx,
        chainId,
        simulateTx,
        extension: "erc721",
      });
      reply.status(StatusCodes.OK).send({
        result: {
          queueId,
        },
      });
    },
  });
}
