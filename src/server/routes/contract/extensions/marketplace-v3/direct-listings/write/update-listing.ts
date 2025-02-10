import { Type, type Static } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { queueTx } from "../../../../../../../shared/db/transactions/queue-tx.js";
import { getContract } from "../../../../../../../shared/utils/cache/get-contract.js";
import { directListingV3InputSchema } from "../../../../../../schemas/marketplace-v3/direct-listing/index.js";
import {
  marketplaceV3ContractParamSchema,
  requestQuerystringSchema,
  standardResponseSchema,
  transactionWritesResponseSchema,
} from "../../../../../../schemas/shared-api-schemas.js";
import { txOverridesWithValueSchema } from "../../../../../../schemas/tx-overrides.js";
import { walletWithAAHeaderSchema } from "../../../../../../schemas/wallet/index.js";
import { getChainIdFromChain } from "../../../../../../utils/chain.js";

// INPUT
const requestSchema = marketplaceV3ContractParamSchema;
const requestBodySchema = Type.Object({
  listingId: Type.String({
    description: "The ID of the listing you want to update.",
  }),
  ...directListingV3InputSchema.properties,
  ...txOverridesWithValueSchema.properties,
});

requestBodySchema.examples = [
  {
    listingId: "0",
  },
];

// LOGIC
export async function directListingsUpdateListing(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof transactionWritesResponseSchema>;
    Body: Static<typeof requestBodySchema>;
    Querystring: Static<typeof requestQuerystringSchema>;
  }>({
    method: "POST",
    url: "/marketplace/:chain/:contractAddress/direct-listings/update-listing",
    schema: {
      summary: "Update direct listing",
      description: "Update a direct listing on this marketplace contract.",
      tags: ["Marketplace-DirectListings"],
      operationId: "updateDirectListing",
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
      const {
        listingId,
        assetContractAddress,
        tokenId,
        pricePerToken,
        currencyContractAddress,
        isReservedListing,
        quantity,
        startTimestamp,
        endTimestamp,
        txOverrides,
      } = request.body;
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
      const tx = await contract.directListings.updateListing.prepare(
        listingId,
        {
          assetContractAddress,
          tokenId,
          pricePerToken,
          currencyContractAddress,
          isReservedListing,
          quantity,
          startTimestamp,
          endTimestamp,
        },
      );

      const queueId = await queueTx({
        tx,
        chainId,
        simulateTx,
        extension: "marketplace-v3-direct-listings",
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
