import { Type, type Static } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { queueTx } from "../../../../../../shared/db/transactions/queue-tx.js";
import { getContract } from "../../../../../../shared/utils/cache/get-contract.js";
import { AddressSchema } from "../../../../../schemas/address.js";
import {
  contractParamSchema,
  requestQuerystringSchema,
  standardResponseSchema,
  transactionWritesResponseSchema,
} from "../../../../../schemas/shared-api-schemas.js";
import { txOverridesWithValueSchema } from "../../../../../schemas/tx-overrides.js";
import { walletWithAAHeaderSchema } from "../../../../../schemas/wallet/index.js";
import { getChainIdFromChain } from "../../../../../utils/chain.js";

const requestBodySchema = Type.Object({
  walletAddress: {
    ...AddressSchema,
    description: "Address to revoke admin permissions from",
  },
  ...txOverridesWithValueSchema.properties,
});

requestBodySchema.examples = [
  {
    walletAddress: "0x3ecdbf3b911d0e9052b64850693888b008e18373",
  },
];

export const revokeAdmin = async (fastify: FastifyInstance) => {
  fastify.route<{
    Params: Static<typeof contractParamSchema>;
    Reply: Static<typeof transactionWritesResponseSchema>;
    Querystring: Static<typeof requestQuerystringSchema>;
    Body: Static<typeof requestBodySchema>;
  }>({
    method: "POST",
    url: "/contract/:chain/:contractAddress/account/admins/revoke",
    schema: {
      summary: "Revoke admin",
      description: "Revoke a smart account's admin permission.",
      tags: ["Account"],
      operationId: "revokeAccountAdmin",
      headers: walletWithAAHeaderSchema,
      params: contractParamSchema,
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
      const { walletAddress, txOverrides } = request.body;
      const {
        "x-backend-wallet-address": backendWalletAddress,
        "x-idempotency-key": idempotencyKey,
        "x-account-address": accountAddress,
      } = request.headers as Static<typeof walletWithAAHeaderSchema>;
      const chainId = await getChainIdFromChain(chain);

      const contract = await getContract({
        chainId,
        contractAddress,
        walletAddress: backendWalletAddress,
        accountAddress,
      });

      const tx =
        await contract.account.revokeAdminPermissions.prepare(walletAddress);
      const queueId = await queueTx({
        tx,
        chainId,
        simulateTx,
        extension: "account",
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
};
