import { type Static, Type } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { queueTx } from "../../../../../shared/db/transactions/queue-tx.js";
import { getContract } from "../../../../../shared/utils/cache/get-contract.js";
import { royaltySchema } from "../../../../schemas/contract/index.js";
import {
  contractParamSchema,
  requestQuerystringSchema,
  standardResponseSchema,
  transactionWritesResponseSchema,
} from "../../../../schemas/shared-api-schemas.js";
import { txOverridesWithValueSchema } from "../../../../schemas/tx-overrides.js";
import { walletWithAAHeaderSchema } from "../../../../schemas/wallet/index.js";
import { getChainIdFromChain } from "../../../../utils/chain.js";

// INPUTS
const requestSchema = contractParamSchema;
const requestBodySchema = Type.Object({
  ...royaltySchema.properties,
  ...txOverridesWithValueSchema.properties,
});

requestBodySchema.examples = [
  {
    fee_recipient: "0x1946267d81Fb8aDeeEa28e6B98bcD446c8248473",
    seller_fee_basis_points: 100,
  },
];

// OUTPUT
const responseSchema = transactionWritesResponseSchema;

export async function setDefaultRoyaltyInfo(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof responseSchema>;
    Body: Static<typeof requestBodySchema>;
    Querystring: Static<typeof requestQuerystringSchema>;
  }>({
    method: "POST",
    url: "/contract/:chain/:contractAddress/royalties/set-default-royalty-info",
    schema: {
      summary: "Set royalty details",
      description: "Set the royalty recipient and fee for the smart contract.",
      tags: ["Contract-Royalties"],
      operationId: "setDefaultRoyaltyInfo",
      headers: walletWithAAHeaderSchema,
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
      const { seller_fee_basis_points, fee_recipient, txOverrides } =
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
      const tx = await contract.royalties.setDefaultRoyaltyInfo.prepare({
        seller_fee_basis_points,
        fee_recipient,
      });

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
