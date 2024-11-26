import { Type, type Static } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { queueTx } from "../../../../../../../db/transactions/queueTx";
import { getContract } from "../../../../../../../utils/cache/getContract";
import {
  marketplaceV3ContractParamSchema,
  requestQuerystringSchema,
  standardResponseSchema,
  transactionWritesResponseSchema,
} from "../../../../../../schemas/sharedApiSchemas";
import { txOverridesWithValueSchema } from "../../../../../../schemas/txOverrides";
import { walletWithAAHeaderSchema } from "../../../../../../schemas/wallet";
import { getChainIdFromChain } from "../../../../../../utils/chain";

// INPUT
const requestSchema = marketplaceV3ContractParamSchema;
const requestBodySchema = Type.Object({
  listingId: Type.String({
    description: "The ID of the listing to execute the sale for.",
  }),
  ...txOverridesWithValueSchema.properties,
});

requestBodySchema.examples = [
  {
    listingId: "0",
  },
];

// LOGIC
export async function englishAuctionsCloseAuctionForSeller(
  fastify: FastifyInstance,
) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof transactionWritesResponseSchema>;
    Body: Static<typeof requestBodySchema>;
    Querystring: Static<typeof requestQuerystringSchema>;
  }>({
    method: "POST",
    url: "/marketplace/:chain/:contractAddress/english-auctions/close-auction-for-seller",
    schema: {
      summary: "Close English auction for seller",
      description: `After an auction has concluded (and a buyout did not occur),
execute the sale for the seller, meaning the seller receives the payment from the highest bid.
You must also call closeAuctionForBidder to execute the sale for the buyer, meaning the buyer receives the NFT(s).`,
      tags: ["Marketplace-EnglishAuctions"],
      operationId: "closeEnglishAuctionForSeller",
      headers: walletWithAAHeaderSchema,
      params: requestSchema,
      body: requestBodySchema,
      querystring: requestQuerystringSchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: transactionWritesResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain, contractAddress } = request.params;
      const { simulateTx } = request.query;
      const { listingId, txOverrides } = request.body;
      const {
        "x-backend-wallet-address": walletAddress,
        "x-account-address": accountAddress,
        "x-idempotency-key": idempotencyKey,
      } = request.headers as Static<typeof walletWithAAHeaderSchema>;
      const chainId = await getChainIdFromChain(chain);
      const contract = await getContract({
        chainId,
        contractAddress,
        walletAddress,
        accountAddress,
      });

      const tx = await contract.englishAuctions.closeAuctionForSeller.prepare(
        listingId,
      );

      const queueId = await queueTx({
        tx,
        chainId,
        simulateTx,
        extension: "marketplace-v3-english-auctions",
        idempotencyKey,
        txOverrides,
      });
      reply.status(StatusCodes.OK).send({
        result: {
          queueId,
        },
      });
    },
  });
}
