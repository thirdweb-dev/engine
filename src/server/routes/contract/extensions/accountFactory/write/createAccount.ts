import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { queueTx } from "../../../../../../db/transactions/queueTx";
import { getContract } from "../../../../../../utils/cache/getContract";
import { prebuiltDeployResponseSchema } from "../../../../../schemas/prebuilts";
import {
  contractParamSchema,
  requestQuerystringSchema,
  standardResponseSchema,
} from "../../../../../schemas/sharedApiSchemas";
import { txOverridesWithValueSchema } from "../../../../../schemas/txOverrides";
import { backendWalletWithAAHeaderSchema } from "../../../../../schemas/wallet";
import { getChainIdFromChain } from "../../../../../utils/chain";

const requestBodySchema = Type.Object({
  adminAddress: Type.String({
    description: "The admin address to create an account for",
  }),
  extraData: Type.Optional(
    Type.String({
      description: "Extra data to add to use in creating the account address",
    }),
  ),
  ...txOverridesWithValueSchema.properties,
});

requestBodySchema.examples = [
  {
    adminAddress: "0x3ecdbf3b911d0e9052b64850693888b008e18373",
  },
];

export const createAccount = async (fastify: FastifyInstance) => {
  fastify.route<{
    Params: Static<typeof contractParamSchema>;
    Reply: Static<typeof prebuiltDeployResponseSchema>;
    Body: Static<typeof requestBodySchema>;
    Querystring: Static<typeof requestQuerystringSchema>;
  }>({
    method: "POST",
    url: "/contract/:chain/:contractAddress/account-factory/create-account",
    schema: {
      summary: "Create smart account",
      description: "Create a smart account for this account factory.",
      tags: ["Account Factory"],
      operationId: "createAccount",
      params: contractParamSchema,
      headers: backendWalletWithAAHeaderSchema,
      body: requestBodySchema,
      querystring: requestQuerystringSchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: prebuiltDeployResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain, contractAddress } = request.params;
      const { simulateTx } = request.query;
      const { adminAddress, extraData, txOverrides } = request.body;
      const {
        "x-backend-wallet-address": walletAddress,
        "x-account-address": accountAddress,
        "x-idempotency-key": idempotencyKey,
      } = request.headers as Static<typeof backendWalletWithAAHeaderSchema>;
      const chainId = await getChainIdFromChain(chain);

      const contract = await getContract({
        chainId,
        walletAddress,
        contractAddress,
        accountAddress,
      });
      const tx = await contract.accountFactory.createAccount.prepare(
        adminAddress,
        extraData,
      );
      const deployedAddress =
        await contract.accountFactory.predictAccountAddress(
          adminAddress,
          extraData,
        );

      const queueId = await queueTx({
        tx,
        chainId,
        simulateTx,
        extension: "account-factory",
        deployedContractAddress: deployedAddress,
        deployedContractType: "account",
        idempotencyKey,
        txOverrides,
      });

      reply.status(StatusCodes.OK).send({
        result: {
          queueId,
          deployedAddress,
        },
      });
    },
  });
};
