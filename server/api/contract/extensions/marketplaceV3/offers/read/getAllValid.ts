import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getContractInstace } from "../../../../../../../core";
import { Static, Type } from "@sinclair/typebox";
import {
  contractParamSchema,
  standardResponseSchema,
} from "../../../../../../helpers/sharedApiSchemas";
import { getAllFilterSchema } from "../../../../../../schemas/marketplaceV3/directListing";
import { OfferV3OutputSchema } from "../../../../../../schemas/marketplaceV3/offer";
import { formatOffersV3Result } from "../../../../../../helpers/marketplaceV3";

// INPUT
const requestSchema = contractParamSchema;
const requestQuerySchema = getAllFilterSchema;

// OUPUT
const responseSchema = Type.Object({
  result: Type.Array(OfferV3OutputSchema),
});

responseSchema.examples = [
  {
    result: [
      {
        assetContractAddress: "0x19411143085F1ec7D21a7cc07000CBA5188C5e8e",
        tokenId: "0",
        currencyContractAddress: "0x9c3C9283D3e44854697Cd22D3Faa240Cfb032889",
        quantity: "1",
        id: "0",
        offerorAddress: "0x1946267d81Fb8aDeeEa28e6B98bcD446c8248473",
        currencyValue: {
          name: "Wrapped Matic",
          symbol: "WMATIC",
          decimals: 18,
          value: "10000000000",
          displayValue: "0.00000001",
        },
        totalPrice: "10000000000",
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
        endTimeInSeconds: 1686610889058,
        status: 4,
      },
    ],
  },
];

// LOGIC
export async function offersGetAllValid(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof responseSchema>;
    Querystring: Static<typeof requestQuerySchema>;
  }>({
    method: "GET",
    url: "/marketplace/v3/:chain_name_or_id/:contract_address/offers/getAllValid",
    schema: {
      description:
        "Get all the valid offers on the smart contract. Valid offers are offers that have not expired, been canceled, or been accepted.",
      tags: ["MarketplaceV3-Offers"],
      operationId: "mktpv3_offersGetAllValid",
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
      const contract = await getContractInstace(
        chain_name_or_id,
        contract_address,
      );
      const result = await contract.offers.getAllValid({
        start,
        count,
        tokenContract,
        tokenId,
        offeror,
        seller,
      });

      const finalResult = result.map((data) => {
        return formatOffersV3Result(data);
      });
      reply.status(StatusCodes.OK).send({
        result: finalResult,
      });
    },
  });
}
