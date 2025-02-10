import { Type, type Static } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getContract } from "../../../../../../../shared/utils/cache/get-contract.js";
import { directListingV3OutputSchema } from "../../../../../../schemas/marketplace-v3/direct-listing/index.js";
import {
  marketplaceFilterSchema,
  marketplaceV3ContractParamSchema,
  standardResponseSchema,
} from "../../../../../../schemas/shared-api-schemas.js";
import { getChainIdFromChain } from "../../../../../../utils/chain.js";
import { formatDirectListingV3Result } from "../../../../../../utils/marketplace-v3.js";

// INPUT
const requestSchema = marketplaceV3ContractParamSchema;
const requestQuerySchema = Type.Omit(marketplaceFilterSchema, ["offeror"]);

// OUTPUT
const responseSchema = Type.Object({
  result: Type.Array(directListingV3OutputSchema),
});

responseSchema.examples = [
  {
    result: [
      {
        assetContractAddress: "0x19411143085F1ec7D21a7cc07000CBA5188C5e8e",
        tokenId: "0",
        currencyContractAddress: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
        quantity: "1",
        pricePerToken: "10000000000",
        isReservedListing: false,
        id: "0",
        currencyValuePerToken: {
          name: "MATIC",
          symbol: "MATIC",
          decimals: 18,
          value: "10000000000",
          displayValue: "0.00000001",
        },
        asset: {
          id: "0",
          uri: "ipfs://QmPw2Dd1dnB6dQCnqGayCTnxUxHrB7m4YFeyph6PYPMboP/0",
          name: "TJ-Origin",
          description: "Origin",
          external_url: "",
          attributes: [
            {
              trait_type: "Mode",
              value: "GOD",
            },
          ],
        },
        status: 1,
        startTimeInSeconds: 1686006043,
        endTimeInSeconds: 1686610889,
      },
    ],
  },
];

// LOGIC
export async function directListingsGetAllValid(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof responseSchema>;
    Querystring: Static<typeof requestQuerySchema>;
  }>({
    method: "GET",
    url: "/marketplace/:chain/:contractAddress/direct-listings/get-all-valid",
    schema: {
      summary: "Get all valid listings",
      description:
        "Get all the valid direct listings for this marketplace contract. A valid listing is where the listing is active, and the creator still owns & has approved Marketplace to transfer the listed NFTs.",
      tags: ["Marketplace-DirectListings"],
      operationId: "getAllValidDirectListings",
      params: requestSchema,
      querystring: requestQuerySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain, contractAddress } = request.params;
      const { start, count, seller, tokenContract, tokenId } = request.query;
      const chainId = await getChainIdFromChain(chain);
      const contract = await getContract({
        chainId,
        contractAddress,
      });
      const result = await contract.directListings.getAllValid({
        start,
        count,
        tokenContract,
        tokenId,
        seller,
      });

      const finalResult = result.map((data) => {
        return formatDirectListingV3Result(data);
      });
      reply.status(StatusCodes.OK).send({
        result: finalResult,
      });
    },
  });
}
