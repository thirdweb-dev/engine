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
      "The ID of the offer to cancel. You can view all offers with getAll or getAllValid.",
  }),
});

requestBodySchema.examples = [
  {
    offer_id: "1",
  },
];

// LOGIC
export async function offersCancelOffer(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof transactionWritesResponseSchema>;
    Body: Static<typeof requestBodySchema>;
  }>({
    method: "POST",
    url: "/marketplace/:network/:contract_address/offers/cancel-offer",
    schema: {
      description: "Cancel an offer you made on an NFT.",
      tags: ["Marketplace-Offers"],
      operationId: "mktpv3_offer_cancelOffer",
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
      const { offer_id } = request.body;
      const walletAddress = request.headers["x-wallet-address"] as string;
      const chainId = getChainIdFromChain(network);
      const contract = await getContract({
        chainId,
        contractAddress: contract_address,
        walletAddress,
      });

      const tx = await contract.offers.cancelOffer.prepare(offer_id);

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
