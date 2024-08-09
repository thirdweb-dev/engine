import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { queueTx } from "../../../../../db/transactions/queueTx";
import { getContract } from "../../../../../utils/cache/getContract";
import { commonTxBodySchema } from "../../../../schemas/commonTxBody";
import {
  contractParamSchema,
  requestQuerystringSchema,
  standardResponseSchema,
  transactionWritesResponseSchema,
} from "../../../../schemas/sharedApiSchemas";
import { txOverridesWithValueSchema } from "../../../../schemas/txOverrides";
import { walletWithAAHeaderSchema } from "../../../../schemas/wallet";
import { getChainIdFromChain } from "../../../../utils/chain";

// INPUTS
const requestSchema = contractParamSchema;
const requestBodySchema = Type.Object({
  role: Type.String({
    description: "The role to grant",
  }),
  address: Type.String({
    description: "The address to grant the role to",
  }),
  ...txOverridesWithValueSchema.properties,
  ...commonTxBodySchema.properties,
});

// OUTPUT
const responseSchema = transactionWritesResponseSchema;

export async function grantRole(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof responseSchema>;
    Body: Static<typeof requestBodySchema>;
    Querystring: Static<typeof requestQuerystringSchema>;
  }>({
    method: "POST",
    url: "/contract/:chain/:contractAddress/roles/grant",
    schema: {
      summary: "Grant role",
      description: "Grant a role to a specific wallet.",
      tags: ["Contract-Roles"],
      operationId: "grant",
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
      const { role, address, txOverrides, externalMetadata } = request.body;
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
      const tx = await contract.roles.grant.prepare(role, address);

      const queueId = await queueTx({
        tx,
        chainId,
        simulateTx,
        extension: "roles",
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
