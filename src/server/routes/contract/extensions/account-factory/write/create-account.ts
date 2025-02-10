import { type Static, Type } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { createAccount as factoryCreateAccount } from "thirdweb/extensions/erc4337";
import { isHex, stringToHex } from "thirdweb/utils";
import { predictAddress } from "thirdweb/wallets/smart";
import { getContractV5 } from "../../../../../../shared/utils/cache/get-contractv5.js";
import { redis } from "../../../../../../shared/utils/redis/redis.js";
import { queueTransaction } from "../../../../../../shared/utils/transaction/queue-transation.js";
import { AddressSchema } from "../../../../../schemas/address.js";
import { prebuiltDeployResponseSchema } from "../../../../../schemas/prebuilts/index.js";
import {
  contractParamSchema,
  requestQuerystringSchema,
  standardResponseSchema,
} from "../../../../../schemas/shared-api-schemas.js";
import { txOverridesWithValueSchema } from "../../../../../schemas/tx-overrides.js";
import {
  maybeAddress,
  requiredAddress,
  walletWithAAHeaderSchema,
} from "../../../../../schemas/wallet/index.js";
import { getChainIdFromChain } from "../../../../../utils/chain.js";

const requestBodySchema = Type.Object({
  adminAddress: {
    ...AddressSchema,
    description: "The admin address to create an account for",
  },
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
      headers: walletWithAAHeaderSchema,
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
        "x-backend-wallet-address": fromAddress,
        "x-account-address": accountAddress,
        "x-account-factory-address": accountFactoryAddress,
        "x-account-salt": accountSalt,
        "x-idempotency-key": idempotencyKey,
        "x-transaction-mode": transactionMode,
      } = request.headers as Static<typeof walletWithAAHeaderSchema>;
      const chainId = await getChainIdFromChain(chain);

      const factoryContract = await getContractV5({
        chainId,
        contractAddress,
      });

      const deployedAddress = await predictAddress({
        factoryContract,
        adminAddress,
        accountSalt: extraData,
      });

      // if extraData is not a hex string, convert it to a hex string
      // this is the same transformation that is done in the SDK
      // for predictAddress and createAndSignUserOp
      // but needed here because we're calling the raw autogenerated abi function
      const accountSaltHex =
        extraData && isHex(extraData)
          ? extraData
          : stringToHex(extraData ?? "");

      const transaction = factoryCreateAccount({
        contract: factoryContract,
        admin: adminAddress,
        data: accountSaltHex,
      });

      const queueId = await queueTransaction({
        transaction,
        fromAddress: requiredAddress(fromAddress, "x-backend-wallet-address"),
        toAddress: maybeAddress(contractAddress, "to"),
        accountAddress: maybeAddress(accountAddress, "x-account-address"),
        accountFactoryAddress: maybeAddress(
          accountFactoryAddress,
          "x-account-factory-address",
        ),
        accountSalt,
        txOverrides,
        idempotencyKey,
        shouldSimulate: simulateTx,
        transactionMode,
      });

      // Note: This is a temporary solution to cache the deployed address's factory for 7 days.
      // This is needed due to a potential race condition of submitting a transaction immediately after creating an account that is not yet mined onchain
      await redis.set(
        `account-factory:${deployedAddress.toLowerCase()}`,
        contractAddress,
        "EX",
        7 * 24 * 60 * 60,
      );

      reply.status(StatusCodes.OK).send({
        result: {
          queueId,
          deployedAddress,
        },
      });
    },
  });
};
