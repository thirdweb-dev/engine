import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { queueTx } from "../../../../../../../db/transactions/queueTx";
import { getContract } from "../../../../../../../utils/cache/getContract";
import { commonTxBodySchema } from "../../../../../../schemas/commonTxBody";
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
    description: "The ID of the listing to cancel auction.",
  }),
  ...commonTxBodySchema.properties,
  ...txOverridesWithValueSchema.properties,
});

requestBodySchema.examples = [
  {
    listingId: "0",
  },
];

// LOGIC
export async function englishAuctionsCancelAuction(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof transactionWritesResponseSchema>;
    Body: Static<typeof requestBodySchema>;
    Querystring: Static<typeof requestQuerystringSchema>;
  }>({
    method: "POST",
    url: "/marketplace/:chain/:contractAddress/english-auctions/cancel-auction",
    schema: {
      summary: "Cancel English auction",
      description:
        "Cancel an existing auction listing. Only the creator of the listing can cancel it. Auctions cannot be canceled once a bid has been made.",
      tags: ["Marketplace-EnglishAuctions"],
      operationId: "cancelAuction",
      params: requestSchema,
      body: requestBodySchema,
      headers: walletWithAAHeaderSchema,
      querystring: requestQuerystringSchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: transactionWritesResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain, contractAddress } = request.params;
      const { simulateTx } = request.query;
      const { listingId, externalMetadata, txOverrides } = request.body;
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

      const tx = await contract.englishAuctions.cancelAuction.prepare(
        listingId,
      );

      const queueId = await queueTx({
        tx,
        chainId,
        simulateTx,
        extension: "marketplace-v3-english-auctions",
        idempotencyKey,
        txOverrides,
        externalMetadata,
      });
      reply.status(StatusCodes.OK).send({
        result: {
          queueId,
        },
      });
    },
  });
}
