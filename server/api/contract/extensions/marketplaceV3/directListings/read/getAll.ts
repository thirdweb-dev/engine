import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getContractInstance } from "../../../../../../../core";
import { Static, Type } from "@sinclair/typebox";
import {
  marketplaceV3ContractParamSchema,
  standardResponseSchema,
} from "../../../../../../helpers/sharedApiSchemas";
import {
  getAllFilterSchema,
  directListingV3OutputSchema,
} from "../../../../../../schemas/marketplaceV3/directListing";
import { formatDirectListingV3Result } from "../../../../../../helpers/marketplaceV3";

// INPUT
const requestSchema = marketplaceV3ContractParamSchema;
const requestQuerySchema = getAllFilterSchema;

// OUPUT
const responseSchema = Type.Object({
  result: Type.Array(directListingV3OutputSchema),
});

responseSchema.example = [
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
export async function directListingsGetAll(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof responseSchema>;
    Querystring: Static<typeof requestQuerySchema>;
  }>({
    method: "GET",
    url: "/marketplace/v3/:chain_name_or_id/:contract_address/directlistings/getAll",
    schema: {
      description: "Retrieve data for all direct listings on the marketplace.",
      tags: ["MarketplaceV3-DirectListings"],
      operationId: "mktpv3_directListings_getAll",
      params: requestSchema,
      querystring: requestQuerySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain_name_or_id, contract_address } = request.params;
      const { start, count, offeror, seller, tokenContract, tokenId } =
        request.query;
      const contract = await getContractInstance(
        chain_name_or_id,
        contract_address,
      );
      const result = await contract.directListings.getAll({
        start,
        count,
        tokenContract,
        tokenId,
        offeror,
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
