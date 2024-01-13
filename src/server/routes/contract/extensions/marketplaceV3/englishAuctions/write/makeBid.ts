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
import { getChainIdFromChain } from "../../../../../../utils/chain";

// INPUT
const requestSchema = marketplaceV3ContractParamSchema;
const requestBodySchema = Type.Object({
  listingId: Type.String({
    description: "The ID of the listing to place a bid on.",
  }),
  bidAmount: Type.String({
    description:
      "The amount of the bid to place in the currency of the listing. Use getNextBidAmount to get the minimum amount for the next bid.",
  }),
});

requestBodySchema.examples = [
  {
    listingId: "0",
    bidAmount: "0.00000001",
  },
];

// LOGIC
export async function englishAuctionsMakeBid(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof transactionWritesResponseSchema>;
    Body: Static<typeof requestBodySchema>;
  }>({
    method: "POST",
    url: "/marketplace/:chain/:contractAddress/english-auctions/make-bid",
    schema: {
      summary: "Make bid",
      description: "Place a bid on an English auction listing.",
      tags: ["Marketplace-EnglishAuctions"],
      operationId: "makeBid",
      params: requestSchema,
      body: requestBodySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: transactionWritesResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain, contractAddress, simulateTx } = request.params;
      const { listingId, bidAmount } = request.body;
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

      const tx = await contract.englishAuctions.makeBid.prepare(
        listingId,
        bidAmount,
      );

      const queueId = await queueTx({
        tx,
        chainId,
        simulateTx,
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
