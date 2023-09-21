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

// OUPUT
const responseSchema = Type.Object({
  result: Type.String(),
});

responseSchema.examples = [
  {
    result: "1",
  },
];

// LOGIC
export async function englishAuctionsGetTotalCount(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof responseSchema>;
  }>({
    method: "GET",
    url: "/marketplace/:network/:contract_address/english-auctions/get-total-count",
    schema: {
      description:
        "Get the total number of direct listings on the marketplace.",
      tags: ["Marketplace-EnglishAuctions"],
      operationId: "mktpv3_englishAuctions_getTotalCount",
      params: requestSchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      const { network, contract_address } = request.params;
      const chainId = getChainIdFromChain(network);
      const contract = await getContract({
        chainId,
        contractAddress: contract_address,
      });
      const result = await contract.englishAuctions.getTotalCount();

      reply.status(StatusCodes.OK).send({
        result: result.toString(),
      });
    },
  });
}
