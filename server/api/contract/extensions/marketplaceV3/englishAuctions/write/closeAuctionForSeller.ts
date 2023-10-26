import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { queueTx } from "../../../../../../../src/db/transactions/queueTx";
import {
  marketplaceV3ContractParamSchema,
  standardResponseSchema,
  transactionWritesResponseSchema,
} from "../../../../../../schemas/sharedApiSchemas";
import { getContract } from "../../../../../../utils/cache/getContract";
import { getChainIdFromChain } from "../../../../../../utils/chain";

// INPUT
const requestSchema = marketplaceV3ContractParamSchema;
const requestBodySchema = Type.Object({
  listing_id: Type.String({
    description: "The ID of the listing to execute the sale for.",
  }),
});

requestBodySchema.examples = [
  {
    listing_id: "0",
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
  }>({
    method: "POST",
    url: "/marketplace/:chain/:contract_address/english-auctions/close-auction-for-seller",
    schema: {
      summary: "Close English auction for seller",
      description: `After an auction has concluded (and a buyout did not occur),
execute the sale for the seller, meaning the seller receives the payment from the highest bid.
You must also call closeAuctionForBidder to execute the sale for the buyer, meaning the buyer receives the NFT(s).`,
      tags: ["Marketplace-EnglishAuctions"],
      operationId: "closeAuctionForSeller",
      params: requestSchema,
      body: requestBodySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: transactionWritesResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain, contract_address } = request.params;
      const { listing_id } = request.body;
      const walletAddress = request.headers[
        "x-backend-wallet-address"
      ] as string;
      const accountAddress = request.headers["x-account-address"] as string;
      const chainId = getChainIdFromChain(chain);
      const contract = await getContract({
        chainId,
        contractAddress: contract_address,
        walletAddress,
        accountAddress,
      });

      const tx = await contract.englishAuctions.closeAuctionForSeller.prepare(
        listing_id,
      );

      const queueId = await queueTx({
        tx,
        chainId,
        extension: "marketplace-v3-english-auctions",
      });
      reply.status(StatusCodes.OK).send({
        result: {
          queueId,
        },
      });
    },
  });
}
