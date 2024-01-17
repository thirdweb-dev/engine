import { Static } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { queueTx } from "../../../../../../../db/transactions/queueTx";
import { getContract } from "../../../../../../../utils/cache/getContract";
import { englishAuctionInputSchema } from "../../../../../../schemas/marketplaceV3/englishAuction";
import {
  marketplaceV3ContractParamSchema,
  requestQuerystringSchema,
  standardResponseSchema,
  transactionWritesResponseSchema,
} from "../../../../../../schemas/sharedApiSchemas";
import { getChainIdFromChain } from "../../../../../../utils/chain";

// INPUT
const requestSchema = marketplaceV3ContractParamSchema;
const requestBodySchema = englishAuctionInputSchema;

requestBodySchema.examples = [
  {
    assetContractAddress: "0x19411143085F1ec7D21a7cc07000CBA5188C5e8e",
    tokenId: "0",
    quantity: "1",
    startTimestamp: 1686006043038,
    endTimestamp: 1686610889058,
    buyoutBidAmount: "0.00000001",
    minimumBidAmount: "0.00000001",
    currencyContractAddress: "0x...",
    bidBufferBps: 100,
    timeBufferInSeconds: 60 * 10,
  },
];

// LOGIC
export async function englishAuctionsCreateAuction(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof transactionWritesResponseSchema>;
    Body: Static<typeof requestBodySchema>;
    Querystring: Static<typeof requestQuerystringSchema>;
  }>({
    method: "POST",
    url: "/marketplace/:chain/:contractAddress/english-auctions/create-auction",
    schema: {
      summary: "Create English auction",
      description:
        "Create an English auction listing on this marketplace contract.",
      tags: ["Marketplace-EnglishAuctions"],
      operationId: "createAuction",
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
        buyoutBidAmount,
        minimumBidAmount,
        currencyContractAddress,
        quantity,
        startTimestamp,
        endTimestamp,
        bidBufferBps,
        timeBufferInSeconds,
      } = request.body;
      const walletAddress = request.headers[
        "x-backend-wallet-address"
      ] as string;
      const accountAddress = request.headers["x-account-address"] as string;
      const chainId = await getChainIdFromChain(chain);
      const contract = await getContract({
        chainId,
        contractAddress,
        walletAddress,
        accountAddress,
      });

      const tx = await contract.englishAuctions.createAuction.prepare({
        assetContractAddress,
        tokenId,
        buyoutBidAmount,
        minimumBidAmount,
        currencyContractAddress,
        quantity,
        startTimestamp,
        endTimestamp,
        bidBufferBps,
        timeBufferInSeconds,
      });

      const queueId = await queueTx({
        tx,
        chainId,
        simulateTx,
        extension: "marketplace-v3-english-auctions",
      });
      reply.status(StatusCodes.OK).send({
        result: {
          queueId,
        },
      });
    },
  });
}
