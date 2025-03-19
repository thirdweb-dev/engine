import { type Static, Type } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { type Hex, prepareTransaction } from "thirdweb";
import { getChain } from "../../../shared/utils/chain";
import { thirdwebClient } from "../../../shared/utils/sdk";
import { queueTransaction } from "../../../shared/utils/transaction/queue-transation";
import { AddressSchema } from "../../schemas/address";
import {
  requestQuerystringSchema,
  standardResponseSchema,
  transactionWritesResponseSchema,
} from "../../schemas/shared-api-schemas";
import {
  authorizationListSchema,
  toParsedAuthorization,
} from "../../schemas/transaction/authorization";
import { txOverridesSchema } from "../../schemas/tx-overrides";
import {
  maybeAddress,
  requiredAddress,
  walletChainParamSchema,
  walletWithAAHeaderSchema,
} from "../../schemas/wallet";
import { getChainIdFromChain } from "../../utils/chain";
import { parseTransactionOverrides } from "../../utils/transaction-overrides";

const requestBodySchema = Type.Object({
  toAddress: Type.Optional(AddressSchema),
  data: Type.String({
    examples: ["0x..."],
  }),
  value: Type.String({
    examples: ["10000000"],
  }),
  authorizationList: authorizationListSchema,
  ...txOverridesSchema.properties,
});

requestBodySchema.examples = [
  {
    toAddress: "0x7a0ce8524bea337f0bee853b68fabde145dac0a0",
    data: "0x449a52f800000000000000000000000043cae0d7fe86c713530e679ce02574743b2ee9fc0000000000000000000000000000000000000000000000000de0b6b3a7640000",
    value: "0x00",
    txOverrides: {
      gas: "50000",
    },
  },
];

export async function sendTransaction(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof walletChainParamSchema>;
    Body: Static<typeof requestBodySchema>;
    Reply: Static<typeof transactionWritesResponseSchema>;
    Querystring: Static<typeof requestQuerystringSchema>;
  }>({
    method: "POST",
    url: "/backend-wallet/:chain/send-transaction",
    schema: {
      summary: "Send a transaction",
      description: "Send a transaction with transaction parameters",
      tags: ["Backend Wallet"],
      operationId: "sendTransaction",
      params: walletChainParamSchema,
      body: requestBodySchema,
      headers: walletWithAAHeaderSchema,
      querystring: requestQuerystringSchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: transactionWritesResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain } = request.params;
      const { toAddress, data, value, txOverrides, authorizationList } =
        request.body;
      const { simulateTx } = request.query;
      const {
        "x-backend-wallet-address": fromAddress,
        "x-idempotency-key": idempotencyKey,
        "x-account-address": accountAddress,
        "x-account-factory-address": accountFactoryAddress,
        "x-account-salt": accountSalt,
        "x-transaction-mode": transactionMode,
      } = request.headers as Static<typeof walletWithAAHeaderSchema>;

      const chainId = await getChainIdFromChain(chain);
      const chainObject = await getChain(chainId);
      const { value: valueOverride, overrides } =
        parseTransactionOverrides(txOverrides);
      const transaction = prepareTransaction({
        client: thirdwebClient,
        chain: chainObject,
        to: toAddress,
        data: data as Hex,
        value: BigInt(value) || valueOverride,
        authorizationList: authorizationList?.map(toParsedAuthorization),
        ...overrides,
      });

      const queueId = await queueTransaction({
        transaction,
        fromAddress: requiredAddress(fromAddress, "x-backend-wallet-address"),
        toAddress: maybeAddress(toAddress, "to"),
        accountAddress: maybeAddress(accountAddress, "x-account-address"),
        accountFactoryAddress: maybeAddress(
          accountFactoryAddress,
          "x-account-factory-address",
        ),
        accountSalt,
        txOverrides,
        idempotencyKey,
        transactionMode,
        shouldSimulate: simulateTx,
      });

      reply.status(StatusCodes.OK).send({
        result: {
          queueId,
        },
      });
    },
  });
}
