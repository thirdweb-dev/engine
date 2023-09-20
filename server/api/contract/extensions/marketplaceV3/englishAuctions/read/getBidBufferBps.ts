import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import {
  marketplaceV3ContractParamSchema,
  standardResponseSchema,
} from "../../../../../../helpers/sharedApiSchemas";
import { getChainIdFromChain } from "../../../../../../utilities/chain";
import { getContract } from "../../../../../../utils/cache/getContract";

// INPUT
const requestSchema = marketplaceV3ContractParamSchema;
const requestQuerySchema = Type.Object({
  listing_id: Type.String({
    description: "The id of the listing to retrieve.",
  }),
});

// OUPUT
const responseSchema = Type.Object({
  result: Type.Number({
    description:
      "Returns a number representing the basis points of the bid buffer.",
  }),
});

responseSchema.examples = [
  {
    result: "1",
  },
];

// LOGIC
export async function englishAuctionsGetBidBufferBps(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof responseSchema>;
    Querystring: Static<typeof requestQuerySchema>;
  }>({
    method: "GET",
    url: "/marketplace/:network/:contract_address/englishAuctions/getBidBufferBps",
    schema: {
      description: `Get the basis points of the bid buffer. 
        This is the percentage higher that a new bid must be than the current highest bid in order to be placed. 
        If there is no current bid, the bid must be at least the minimum bid amount.
        Returns the value in percentage format, e.g. 100 = 1%.`,
      tags: ["Marketplace-EnglishAuctions"],
      operationId: "mktpv3_englishAuctions_getBidBufferBps",
      params: requestSchema,
      querystring: requestQuerySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      const { network, contract_address } = request.params;
      const { listing_id } = request.query;
      const chainId = getChainIdFromChain(network);
      const contract = await getContract({
        chainId,
        contractAddress: contract_address,
      });
      const result = await contract.englishAuctions.getBidBufferBps(listing_id);

      reply.status(StatusCodes.OK).send({
        result,
      });
    },
  });
}
