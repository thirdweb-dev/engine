import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { queueTx } from "../../../../../db/transactions/queueTx";
import { getContract } from "../../../../../utils/cache/getContract";
import { RoyaltySchema } from "../../../../schemas/contract";
import {
  contractParamSchema,
  requestQuerystringSchema,
  standardResponseSchema,
  transactionWritesResponseSchema,
} from "../../../../schemas/sharedApiSchemas";
import { txOverridesWithValueSchema } from "../../../../schemas/txOverrides";
import { backendWalletWithAAHeaderSchema } from "../../../../schemas/wallet";
import { getChainIdFromChain } from "../../../../utils/chain";

// INPUTS
const requestSchema = contractParamSchema;
const requestBodySchema = Type.Object({
  ...RoyaltySchema.properties,
  token_id: Type.String({
    description: "The token ID to set the royalty info for.",
  }),
  ...txOverridesWithValueSchema.properties,
});

requestBodySchema.examples = [
  {
    fee_recipient: "0x1946267d81Fb8aDeeEa28e6B98bcD446c8248473",
    seller_fee_basis_points: 100,
    token_id: "0",
  },
];

// OUTPUT
const responseSchema = transactionWritesResponseSchema;

export async function setTokenRoyaltyInfo(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof responseSchema>;
    Body: Static<typeof requestBodySchema>;
    Querystring: Static<typeof requestQuerystringSchema>;
  }>({
    method: "POST",
    url: "/contract/:chain/:contractAddress/royalties/set-token-royalty-info",
    schema: {
      summary: "Set token royalty details",
      description:
        "Set the royalty recipient and fee for a particular token in the contract.",
      tags: ["Contract-Royalties"],
      operationId: "setTokenRoyaltyInfo",
      headers: backendWalletWithAAHeaderSchema,
      params: requestSchema,
      body: requestBodySchema,
      querystring: requestQuerystringSchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain, contractAddress } = request.params;
      const { simulateTx } = request.query;
      const { seller_fee_basis_points, fee_recipient, token_id, txOverrides } =
        request.body;
      const {
        "x-backend-wallet-address": walletAddress,
        "x-account-address": accountAddress,
        "x-idempotency-key": idempotencyKey,
      } = request.headers as Static<typeof backendWalletWithAAHeaderSchema>;

      const chainId = await getChainIdFromChain(chain);
      const contract = await getContract({
        chainId,
        contractAddress,
        walletAddress,
        accountAddress,
      });
      const tx = await contract.royalties.setTokenRoyaltyInfo.prepare(
        token_id,
        {
          seller_fee_basis_points,
          fee_recipient,
        },
      );

      const queueId = await queueTx({
        tx,
        chainId,
        simulateTx,
        extension: "none",
        idempotencyKey,
        txOverrides,
      });

      reply.status(StatusCodes.OK).send({
        result: {
          queueId,
        },
      });
    },
  });
}
