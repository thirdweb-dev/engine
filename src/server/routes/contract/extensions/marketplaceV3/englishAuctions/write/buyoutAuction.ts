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
    description: "The ID of the listing to buy NFT(s) from.",
  }),
});

requestBodySchema.examples = [
  {
    listingId: "0",
  },
];

// LOGIC
export async function englishAuctionsBuyoutAuction(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof transactionWritesResponseSchema>;
    Body: Static<typeof requestBodySchema>;
  }>({
    method: "POST",
    url: "/marketplace/:chain/:contractAddress/english-auctions/buyout-auction",
    schema: {
      summary: "Buyout English auction",
      description: "Buyout the listing for this auction.",
      tags: ["Marketplace-EnglishAuctions"],
      operationId: "buyoutAuction",
      params: requestSchema,
      body: requestBodySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: transactionWritesResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain, contractAddress, simulateTx } = request.params;
      const { listingId } = request.body;
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

      const tx = await contract.englishAuctions.buyoutAuction.prepare(
        listingId,
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
