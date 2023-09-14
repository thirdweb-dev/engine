import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getContractInstance } from "../../../../../../../core";
import { queueTx } from "../../../../../../../src/db/transactions/queueTx";
import {
  marketplaceV3ContractParamSchema,
  standardResponseSchema,
  transactionWritesResponseSchema,
} from "../../../../../../helpers/sharedApiSchemas";
import { getChainIdFromChain } from "../../../../../../utilities/chain";

// INPUT
const requestSchema = marketplaceV3ContractParamSchema;
const requestBodySchema = Type.Object({
  listing_id: Type.String({
    description: "The ID of the listing to place a bid on.",
  }),
  bid_amount: Type.String({
    description:
      "The amount of the bid to place in the currency of the listing. Use getNextBidAmount to get the minimum amount for the next bid.",
  }),
});

requestBodySchema.examples = [
  {
    assetContractAddress: "0x19411143085F1ec7D21a7cc07000CBA5188C5e8e",
    tokenId: "0",
    pricePerToken: "0.00000001",
    isReservedListing: false,
    quantity: "1",
    startTimestamp: 1686006043038,
    endTimestamp: 1686610889058,
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
    url: "/marketplace/:network/:contract_address/englishAuctions/makeBid",
    schema: {
      description: "Place a new bid on an auction listing.",
      tags: ["Marketplace-EnglishAuctions"],
      operationId: "mktpv3_englishAuctions_makeBid",
      params: requestSchema,
      body: requestBodySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: transactionWritesResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const { network, contract_address } = request.params;
      const { listing_id, bid_amount } = request.body;
      const chainId = getChainIdFromChain(network);

      const contract = await getContractInstance(network, contract_address);
      const tx = await contract.englishAuctions.makeBid.prepare(
        listing_id,
        bid_amount,
      );

      const queuedId = await queueTx({
        tx,
        chainId,
        extension: "marketplace-v3-english-auctions",
      });
      reply.status(StatusCodes.OK).send({
        result: queuedId,
      });
    },
  });
}
