import { Type, type Static } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import type { Address, Hex } from "thirdweb";
import { insertTransaction } from "../../../shared/utils/transaction/insert-transaction";
import { AddressSchema } from "../../schemas/address";
import {
  requestQuerystringSchema,
  standardResponseSchema,
  transactionWritesResponseSchema,
} from "../../schemas/shared-api-schemas";
import { txOverridesSchema } from "../../schemas/tx-overrides";
import {
  maybeAddress,
  walletChainParamSchema,
  walletWithAAHeaderSchema,
} from "../../schemas/wallet";
import { getChainIdFromChain } from "../../utils/chain";
import { parseTransactionOverrides } from "../../utils/transaction-overrides";
import {
  authorizationListSchema,
  toParsedAuthorization,
} from "../../schemas/transaction/authorization";

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
        "x-transaction-mode": transactionMode,
      } = request.headers as Static<typeof walletWithAAHeaderSchema>;

      const chainId = await getChainIdFromChain(chain);

      let queueId: string;
      if (accountAddress) {
        queueId = await insertTransaction({
          insertedTransaction: {
            isUserOp: true,
            chainId,
            from: fromAddress as Address,
            to: toAddress as Address | undefined,
            data: data as Hex,
            value: BigInt(value),
            accountAddress: accountAddress as Address,
            signerAddress: fromAddress as Address,
            target: toAddress as Address | undefined,
            transactionMode: undefined,
            accountFactoryAddress: maybeAddress(
              accountFactoryAddress,
              "x-account-factory-address",
            ),
            ...parseTransactionOverrides(txOverrides),
          },
          shouldSimulate: simulateTx,
          idempotencyKey,
        });
      } else {
        queueId = await insertTransaction({
          insertedTransaction: {
            isUserOp: false,
            chainId,
            from: fromAddress as Address,
            to: toAddress as Address | undefined,
            data: data as Hex,
            transactionMode: transactionMode,
            value: BigInt(value),
            authorizationList: authorizationList?.map(toParsedAuthorization),
            ...parseTransactionOverrides(txOverrides),
          },
          shouldSimulate: simulateTx,
          idempotencyKey,
        });
      }

      reply.status(StatusCodes.OK).send({
        result: {
          queueId,
        },
      });
    },
  });
}
