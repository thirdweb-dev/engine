import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { queueTx } from "../../../../../../../db/transactions/queueTx";
import { getContract } from "../../../../../../../utils/cache/getContract";
import {
  marketplaceV3ContractParamSchema,
  standardResponseSchema,
  transactionWritesResponseSchema,
} from "../../../../../../schemas/sharedApiSchemas";
import { walletAuthSchema } from "../../../../../../schemas/wallet";
import { getChainIdFromChain } from "../../../../../../utils/chain";

// INPUT
const requestSchema = marketplaceV3ContractParamSchema;
const requestBodySchema = Type.Object({
  listingId: Type.String({
    description: "The ID of the listing you want to approve a buyer for.",
  }),
  quantity: Type.String({
    description: "The number of tokens to buy (default is 1 for ERC721 NFTs).",
  }),
  buyer: Type.String({
    description: "The wallet address of the buyer.",
  }),
});

requestBodySchema.examples = [
  {
    listingId: "0",
    quantity: "1",
    buyer: "0x19411143085F1ec7D21a7cc07000CBA5188C5e8e",
  },
];

// LOGIC
export async function directListingsBuyFromListing(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof transactionWritesResponseSchema>;
    Body: Static<typeof requestBodySchema>;
  }>({
    method: "POST",
    url: "/marketplace/:chain/:contractAddress/direct-listings/buy-from-listing",
    schema: {
      summary: "Buy from direct listing",
      description:
        "Buy from a specific direct listing from this marketplace contract.",
      tags: ["Marketplace-DirectListings"],
      operationId: "buyFromListing",
      headers: walletAuthSchema,
      params: requestSchema,
      body: requestBodySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: transactionWritesResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain, contractAddress } = request.params;
      const { listingId, quantity, buyer } = request.body;
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

      const tx = await contract.directListings.buyFromListing.prepare(
        listingId,
        quantity,
        buyer,
      );

      const queueId = await queueTx({
        tx,
        chainId,
        extension: "marketplace-v3-direct-listings",
      });
      reply.status(StatusCodes.OK).send({
        result: {
          queueId,
        },
      });
    },
  });
}
