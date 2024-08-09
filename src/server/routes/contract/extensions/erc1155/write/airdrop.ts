import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { queueTx } from "../../../../../../db/transactions/queueTx";
import { getContract } from "../../../../../../utils/cache/getContract";
import { commonTxBodySchema } from "../../../../../schemas/commonTxBody";
import {
  erc1155ContractParamSchema,
  requestQuerystringSchema,
  standardResponseSchema,
  transactionWritesResponseSchema,
} from "../../../../../schemas/sharedApiSchemas";
import { txOverridesWithValueSchema } from "../../../../../schemas/txOverrides";
import { walletWithAAHeaderSchema } from "../../../../../schemas/wallet";
import { getChainIdFromChain } from "../../../../../utils/chain";

// INPUTS
const requestSchema = erc1155ContractParamSchema;
const requestBodySchema = Type.Object({
  tokenId: Type.String({
    description: "Token ID of the NFT to airdrop",
  }),
  addresses: Type.Array(
    Type.Object({
      address: Type.String(),
      quantity: Type.String({
        default: "1",
      }),
    }),
    {
      description: "Addresses and quantities to airdrop to",
    },
  ),
  ...txOverridesWithValueSchema.properties,
  ...commonTxBodySchema.properties,
});

requestBodySchema.examples = [
  {
    tokenId: "0",
    addresses: [
      {
        address: "0xE79ee09bD47F4F5381dbbACaCff2040f2FbC5803",
        quantity: "1",
      },
      {
        address: "0x3EcDBF3B911d0e9052b64850693888b008e18373",
        quantity: "1",
      },
    ],
  },
];

export async function erc1155airdrop(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof transactionWritesResponseSchema>;
    Body: Static<typeof requestBodySchema>;
    Querystring: Static<typeof requestQuerystringSchema>;
  }>({
    method: "POST",
    url: "/contract/:chain/:contractAddress/erc1155/airdrop",
    schema: {
      summary: "Airdrop tokens",
      description: "Airdrop ERC-1155 tokens to specific wallets.",
      tags: ["ERC1155"],
      operationId: "airdrop",
      params: requestSchema,
      body: requestBodySchema,
      headers: walletWithAAHeaderSchema,
      querystring: requestQuerystringSchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: transactionWritesResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain, contractAddress } = request.params;
      const { simulateTx } = request.query;
      const { tokenId, addresses, txOverrides, externalMetadata } =
        request.body;
      const {
        "x-backend-wallet-address": walletAddress,
        "x-account-address": accountAddress,
        "x-idempotency-key": idempotencyKey,
      } = request.headers as Static<typeof walletWithAAHeaderSchema>;
      const chainId = await getChainIdFromChain(chain);
      const contract = await getContract({
        chainId,
        contractAddress,
        walletAddress,
        accountAddress,
      });

      const tx = await contract.erc1155.airdrop.prepare(tokenId, addresses);
      const queueId = await queueTx({
        tx,
        chainId,
        simulateTx,
        extension: "erc1155",
        idempotencyKey,
        txOverrides,
        externalMetadata,
      });
      reply.status(StatusCodes.OK).send({
        result: {
          queueId,
        },
      });
    },
  });
}
