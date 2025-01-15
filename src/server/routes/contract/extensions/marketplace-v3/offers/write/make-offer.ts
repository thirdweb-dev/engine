import { Type, type Static } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { queueTx } from "../../../../../../../shared/db/transactions/queue-tx";
import { getContract } from "../../../../../../../shared/utils/cache/get-contract";
import { OfferV3InputSchema } from "../../../../../../schemas/marketplace-v3/offer";
import {
  marketplaceV3ContractParamSchema,
  requestQuerystringSchema,
  standardResponseSchema,
  transactionWritesResponseSchema,
} from "../../../../../../schemas/shared-api-schemas";
import { txOverridesWithValueSchema } from "../../../../../../schemas/tx-overrides";
import { walletWithAAHeaderSchema } from "../../../../../../schemas/wallet";
import { getChainIdFromChain } from "../../../../../../utils/chain";

// INPUT
const requestSchema = marketplaceV3ContractParamSchema;
const requestBodySchema = Type.Object({
  ...OfferV3InputSchema.properties,
  ...txOverridesWithValueSchema.properties,
});

requestBodySchema.examples = [
  {
    assetContractAddress: "0x19411143085F1ec7D21a7cc07000CBA5188C5e8e",
    tokenId: "0",
    quantity: "1",
    endTimestamp: 1686610889058,
    currencyContractAddress: "0x...",
    totalPrice: "0.00000001",
  },
];

// LOGIC
export async function offersMakeOffer(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof transactionWritesResponseSchema>;
    Body: Static<typeof requestBodySchema>;
    Querystring: Static<typeof requestQuerystringSchema>;
  }>({
    method: "POST",
    url: "/marketplace/:chain/:contractAddress/offers/make-offer",
    schema: {
      summary: "Make offer",
      description: "Make an offer on a token. A valid listing is not required.",
      tags: ["Marketplace-Offers"],
      operationId: "makeMarketplaceOffer",
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
        assetContractAddress,
        tokenId,
        totalPrice,
        currencyContractAddress,
        endTimestamp,
        quantity,
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
      const tx = await contract.offers.makeOffer.prepare({
        assetContractAddress,
        tokenId,
        totalPrice,
        currencyContractAddress,
        endTimestamp,
        quantity,
      });

      const queueId = await queueTx({
        tx,
        chainId,
        simulateTx,
        extension: "marketplace-v3-offers",
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
