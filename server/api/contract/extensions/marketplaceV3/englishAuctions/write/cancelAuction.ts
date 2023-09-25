import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { queueTx } from "../../../../../../../src/db/transactions/queueTx";
import {
  marketplaceV3ContractParamSchema,
  standardResponseSchema,
  transactionWritesResponseSchema,
} from "../../../../../../helpers/sharedApiSchemas";
import { getChainIdFromChain } from "../../../../../../utilities/chain";
import { getContract } from "../../../../../../utils/cache/getContract";

// INPUT
const requestSchema = marketplaceV3ContractParamSchema;
const requestBodySchema = Type.Object({
  listing_id: Type.String({
    description: "The ID of the listing to cancel auction.",
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
export async function englishAuctionsCancelAuction(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof transactionWritesResponseSchema>;
    Body: Static<typeof requestBodySchema>;
  }>({
    method: "POST",
    url: "/marketplace/:chain/:contract_address/english-auctions/cancel-auction",
    schema: {
      description:
        "Cancel an auction listing you previously created. Only the creator of the listing can cancel it. Auctions cannot be canceled once a bid has been made.",
      tags: ["Marketplace-EnglishAuctions"],
      operationId: "mktpv3_englishAuctions_cancelAuction",
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
      const walletAddress = request.headers["x-wallet-address"] as string;
      const accountAddress = request.headers["x-account-address"] as string;
      const chainId = getChainIdFromChain(chain);
      const contract = await getContract({
        chainId,
        contractAddress: contract_address,
        walletAddress,
        accountAddress,
      });

      const tx = await contract.englishAuctions.buyoutAuction.prepare(
        listing_id,
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
