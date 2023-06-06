import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getContractInstace } from "../../../../../../../core";
import { Static, Type } from "@sinclair/typebox";
import {
  contractParamSchema,
  standardResponseSchema,
  transactionWritesResponseSchema,
} from "../../../../../../helpers/sharedApiSchemas";
import { queueTransaction } from "../../../../../../helpers";

// INPUT
const requestSchema = contractParamSchema;
const requestBodySchema = Type.Object({
  listing_id: Type.String({
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
    listing_id: "0",
    quantity: "1",
    buyer: "0x19411143085F1ec7D21a7cc07000CBA5188C5e8e",
  },
];

// LOGIC
export async function dlBuyFromListing(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof transactionWritesResponseSchema>;
    Body: Static<typeof requestBodySchema>;
  }>({
    method: "POST",
    url: "/marketplace/v3/:chain_name_or_id/:contract_address/directListing/buyFromListing",
    schema: {
      description: "Buy an NFT from a listing.",
      tags: ["MarketplaceV3-DirectListing"],
      operationId: "mktpv3_buyFromListing",
      params: requestSchema,
      body: requestBodySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: transactionWritesResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain_name_or_id, contract_address } = request.params;
      const { listing_id, quantity, buyer } = request.body;

      const contract = await getContractInstace(
        chain_name_or_id,
        contract_address,
      );
      const tx = await contract.directListings.buyFromListing.prepare(
        listing_id,
        quantity,
        buyer,
      );

      const queuedId = await queueTransaction(
        request,
        tx,
        chain_name_or_id,
        "mktplcV3-directListing",
      );
      reply.status(StatusCodes.OK).send({
        result: queuedId,
      });
    },
  });
}
