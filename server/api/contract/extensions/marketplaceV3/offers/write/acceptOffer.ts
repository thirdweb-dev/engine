import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { walletAuthSchema } from "../../../../../../../core/schema";
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
  offer_id: Type.String({
    description:
      "The ID of the offer to accept. You can view all offers with getAll or getAllValid.",
  }),
});

requestBodySchema.examples = [
  {
    offer_id: "1",
  },
];

// LOGIC
export async function offersAcceptOffer(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof transactionWritesResponseSchema>;
    Body: Static<typeof requestBodySchema>;
  }>({
    method: "POST",
    url: "/marketplace/:chain/:contract_address/offers/accept-offer",
    schema: {
      description: "Accept an offer placed on your NFT.",
      tags: ["Marketplace-Offers"],
      operationId: "mktpv3_offer_acceptOffer",
      headers: walletAuthSchema,
      params: requestSchema,
      body: requestBodySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: transactionWritesResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain, contract_address } = request.params;
      const { offer_id } = request.body;
      const walletAddress = request.headers[
        "x-backend-wallet-address"
      ] as string;
      const accountAddress = request.headers["x-account-address"] as string;
      const chainId = getChainIdFromChain(chain);
      const contract = await getContract({
        chainId,
        contractAddress: contract_address,
        walletAddress,
        accountAddress,
      });

      const tx = await contract.offers.acceptOffer.prepare(offer_id);

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
