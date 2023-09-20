import { Static } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { walletAuthSchema } from "../../../../../../../core/schema";
import { queueTx } from "../../../../../../../src/db/transactions/queueTx";
import {
  marketplaceV3ContractParamSchema,
  standardResponseSchema,
  transactionWritesResponseSchema,
} from "../../../../../../helpers/sharedApiSchemas";
import { OfferV3InputSchema } from "../../../../../../schemas/marketplaceV3/offer";
import { getChainIdFromChain } from "../../../../../../utilities/chain";
import { getContract } from "../../../../../../utils/cache/getContract";

// INPUT
const requestSchema = marketplaceV3ContractParamSchema;
const requestBodySchema = OfferV3InputSchema;

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
  }>({
    method: "POST",
    url: "/marketplace/:network/:contract_address/offers/makeOffer",
    schema: {
      description:
        "Make a new offer on an NFT. Offers can be made on any NFT, regardless of whether it is listed for sale or not.",
      tags: ["Marketplace-Offers"],
      operationId: "mktpv3_offer_makeOffer",
      headers: walletAuthSchema,
      params: requestSchema,
      body: requestBodySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: transactionWritesResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const { network, contract_address } = request.params;
      const {
        assetContractAddress,
        tokenId,
        totalPrice,
        currencyContractAddress,
        endTimestamp,
        quantity,
      } = request.body;
      const walletAddress = request.headers["x-wallet-address"] as string;
      const chainId = getChainIdFromChain(network);
      const contract = await getContract({
        chainId,
        contractAddress: contract_address,
        walletAddress,
      });

      const tx = await contract.offers.makeOffer.prepare({
        assetContractAddress,
        tokenId,
        totalPrice,
        currencyContractAddress,
        endTimestamp,
        quantity,
      });

      const queuedId = await queueTx({
        tx,
        chainId,
        extension: "marketplace-v3-offers",
      });
      reply.status(StatusCodes.OK).send({
        result: queuedId,
      });
    },
  });
}
