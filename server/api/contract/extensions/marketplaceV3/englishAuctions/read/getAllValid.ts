import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { formatEnglishAuctionResult } from "../../../../../../helpers/marketplaceV3";
import {
  marketplaceFilterSchema,
  marketplaceV3ContractParamSchema,
  standardResponseSchema,
} from "../../../../../../helpers/sharedApiSchemas";
import { englishAuctionOutputSchema } from "../../../../../../schemas/marketplaceV3/englishAuction";
import { getChainIdFromChain } from "../../../../../../utilities/chain";
import { getContract } from "../../../../../../utils/cache/getContract";

// INPUT
const requestSchema = marketplaceV3ContractParamSchema;
const requestQuerySchema = Type.Omit(marketplaceFilterSchema, ["offeror"]);

// OUPUT
const responseSchema = Type.Object({
  result: Type.Array(englishAuctionOutputSchema),
});

responseSchema.examples = [
  {
    result: [
      {
        assetContractAddress: "0x19411143085F1ec7D21a7cc07000CBA5188C5e8e",
        tokenId: "0",
        currencyContractAddress: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
        quantity: "1",
        id: "0",
        minimumBidAmount: "10000000000",
        buyoutBidAmount: "10000000000",
        buyoutCurrencyValue: {
          name: "MATIC",
          symbol: "MATIC",
          decimals: 18,
          value: "10000000000",
          displayValue: "0.00000001",
        },
        timeBufferInSeconds: 600,
        bidBufferBps: 100,
        startTimeInSeconds: 1686006043,
        endTimeInSeconds: 1686610889,
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
      },
    ],
  },
];

// LOGIC
export async function englishAuctionsGetAllValid(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof responseSchema>;
    Querystring: Static<typeof requestQuerySchema>;
  }>({
    method: "GET",
    url: "/marketplace/:chain/:contract_address/english-auctions/get-all-valid",
    schema: {
      summary: "Get all valid English auctions",
      description:
        "Get all valid English auction listings on this marketplace contract.",
      tags: ["Marketplace-EnglishAuctions"],
      operationId: "getAllValid",
      params: requestSchema,
      querystring: requestQuerySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain, contract_address } = request.params;
      const { start, count, seller, tokenContract, tokenId } = request.query;
      const chainId = getChainIdFromChain(chain);
      const contract = await getContract({
        chainId,
        contractAddress: contract_address,
      });
      const result = await contract.englishAuctions.getAllValid({
        start,
        count,
        tokenContract,
        tokenId,
        seller,
      });

      const finalResult = result.map((data) => {
        return formatEnglishAuctionResult(data);
      });
      reply.status(StatusCodes.OK).send({
        result: finalResult,
      });
    },
  });
}
