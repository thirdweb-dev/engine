import { Type, type Static } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { queueTx } from "../../../../../../db/transactions/queueTx";
import { getContract } from "../../../../../../utils/cache/getContract";
import { sessionSchema } from "../../../../../schemas/account";
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
  ...sessionSchema.properties,
  ...txOverridesWithValueSchema.properties,
});

requestBodySchema.examples = [
  {
    signerAddress: "0x3ecdbf3b911d0e9052b64850693888b008e18373",
    startDate: "2021-01-01T00:00:00.000Z",
    expirationDate: "2022-01-01T00:10:00.000Z",
    nativeTokenLimitPerTransaction: "1000000000000000000",
    approvedCallTargets: ["0x1946267d81Fb8aDeeEa28e6B98bcD446c8248473"],
  },
];

export const grantSession = async (fastify: FastifyInstance) => {
  fastify.route<{
    Params: Static<typeof contractParamSchema>;
    Reply: Static<typeof transactionWritesResponseSchema>;
    Body: Static<typeof requestBodySchema>;
    Querystring: Static<typeof requestQuerystringSchema>;
  }>({
    method: "POST",
    url: "/contract/:chain/:contractAddress/account/sessions/create",
    schema: {
      summary: "Create session key",
      description: "Create a session key for a smart account.",
      tags: ["Account"],
      operationId: "grantAccountSession",
      params: contractParamSchema,
      headers: walletWithAAHeaderSchema,
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
      const { signerAddress, txOverrides, ...permissions } = request.body;
      const {
        "x-backend-wallet-address": walletAddress,
        "x-idempotency-key": idempotencyKey,
        "x-account-address": accountAddress,
      } = request.headers as Static<typeof walletWithAAHeaderSchema>;
      const chainId = await getChainIdFromChain(chain);

      const contract = await getContract({
        chainId,
        contractAddress,
        walletAddress,
        accountAddress,
      });

      const tx = await contract.account.grantPermissions.prepare(
        signerAddress,
        {
          startDate: new Date(permissions.startDate),
          expirationDate: new Date(permissions.expirationDate),
          approvedCallTargets: permissions.approvedCallTargets,
          nativeTokenLimitPerTransaction:
            permissions.nativeTokenLimitPerTransaction,
        },
      );
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
