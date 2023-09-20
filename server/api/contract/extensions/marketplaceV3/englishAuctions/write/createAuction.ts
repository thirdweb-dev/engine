import { Static } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { queueTx } from "../../../../../../../src/db/transactions/queueTx";
import {
  marketplaceV3ContractParamSchema,
  standardResponseSchema,
  transactionWritesResponseSchema,
} from "../../../../../../helpers/sharedApiSchemas";
import { englishAuctionInputSchema } from "../../../../../../schemas/marketplaceV3/englishAuction";
import { getChainIdFromChain } from "../../../../../../utilities/chain";
import { getContract } from "../../../../../../utils/cache/getContract";

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
  }>({
    method: "POST",
    url: "/marketplace/:network/:contract_address/englishAuctions/createAuction",
    schema: {
      description: "Create a new auction listing on the marketplace.",
      tags: ["Marketplace-EnglishAuctions"],
      operationId: "mktpv3_englishAuctions_createAuction",
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
        buyoutBidAmount,
        minimumBidAmount,
        currencyContractAddress,
        quantity,
        startTimestamp,
        endTimestamp,
        bidBufferBps,
        timeBufferInSeconds,
      } = request.body;
      const walletAddress = request.headers["x-wallet-address"] as string;
      const chainId = getChainIdFromChain(network);
      const contract = await getContract({
        chainId,
        contractAddress: contract_address,
        walletAddress,
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

      const queuedId = await queueTx({
        tx,
        chainId,
        extension: "marketplace-v3-english-auctions",
      });
      reply.status(StatusCodes.OK).send({
        result: queuedId,
      });
    },
  });
}
