import { Type, type Static } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { queueTx } from "../../../../../../../shared/db/transactions/queueTx";
import { getContract } from "../../../../../../../shared/utils/cache/getContract";
import { AddressSchema } from "../../../../../../schemas/address";
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
    description: "The ID of the listing you want to approve a buyer for.",
  }),
  currencyContractAddress: {
    ...AddressSchema,
    description: "The wallet address of the buyer to approve.",
  },
  ...txOverridesWithValueSchema.properties,
});

requestBodySchema.examples = [
  {
    listingId: "0",
    currencyContractAddress: "0x19411143085F1ec7D21a7cc07000CBA5188C5e8e",
  },
];

// LOGIC
export async function directListingsRevokeCurrencyApprovalForListing(
  fastify: FastifyInstance,
) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof transactionWritesResponseSchema>;
    Body: Static<typeof requestBodySchema>;
    Querystring: Static<typeof requestQuerystringSchema>;
  }>({
    method: "POST",
    url: "/marketplace/:chain/:contractAddress/direct-listings/revoke-currency-approval-for-listing",
    schema: {
      summary: "Revoke currency approval for reserved listing",
      description: "Revoke approval of a currency for a reserved listing.",
      tags: ["Marketplace-DirectListings"],
      operationId: "revokeCurrencyApprovalForListing",
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
      const { listingId, currencyContractAddress, txOverrides } = request.body;
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
      const tx =
        await contract.directListings.revokeCurrencyApprovalForListing.prepare(
          listingId,
          currencyContractAddress,
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
