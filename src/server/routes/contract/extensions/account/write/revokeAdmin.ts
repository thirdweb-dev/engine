import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { queueTx } from "../../../../../../db/transactions/queueTx";
import { getContract } from "../../../../../../utils/cache/getContract";
import { commonTxBodySchema } from "../../../../../schemas/commonTxBody";
import {
  contractParamSchema,
  requestQuerystringSchema,
  standardResponseSchema,
  transactionWritesResponseSchema,
} from "../../../../../schemas/sharedApiSchemas";
import { txOverridesWithValueSchema } from "../../../../../schemas/txOverrides";
import { walletWithAAHeaderSchema } from "../../../../../schemas/wallet";
import { getChainIdFromChain } from "../../../../../utils/chain";

const requestBodySchema = Type.Object({
  walletAddress: Type.String({
    description: "Address to revoke admin permissions from",
  }),
  ...txOverridesWithValueSchema.properties,
  ...commonTxBodySchema.properties,
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
      operationId: "revokeAdmin",
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
      const { walletAddress, txOverrides, externalMetadata } = request.body;
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

      const tx = await contract.account.revokeAdminPermissions.prepare(
        walletAddress,
      );
      const queueId = await queueTx({
        tx,
        chainId,
        simulateTx,
        extension: "account",
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
};
