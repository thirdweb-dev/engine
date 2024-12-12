import { Type, type Static } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getContract } from "thirdweb";
import { transfer } from "thirdweb/extensions/erc20";
import { getChain } from "../../../../../../shared/utils/chain";
import { getChecksumAddress } from "../../../../../../shared/utils/primitive-types";
import { thirdwebClient } from "../../../../../../shared/utils/sdk";
import { queueTransaction } from "../../../../../../shared/utils/transaction/queue-transation";
import { AddressSchema } from "../../../../../schemas/address";
import { TokenAmountStringSchema } from "../../../../../schemas/number";
import {
  erc20ContractParamSchema,
  requestQuerystringSchema,
  standardResponseSchema,
  transactionWritesResponseSchema,
} from "../../../../../schemas/shared-api-schemas";
import { txOverridesWithValueSchema } from "../../../../../schemas/tx-overrides";
import { walletWithAAHeaderSchema } from "../../../../../schemas/wallet";
import { getChainIdFromChain } from "../../../../../utils/chain";

const requestSchema = erc20ContractParamSchema;
const requestBodySchema = Type.Object({
  toAddress: {
    ...AddressSchema,
    description: "The recipient address.",
  },
  amount: Type.String({
    ...TokenAmountStringSchema,
    description: "The amount of tokens to transfer.",
  }),
  ...txOverridesWithValueSchema.properties,
});

// Example for the Request Body
requestBodySchema.examples = [
  {
    toAddress: "0x3EcDBF3B911d0e9052b64850693888b008e18373",
    amount: "0.1",
  },
];

export async function erc20Transfer(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof transactionWritesResponseSchema>;
    Body: Static<typeof requestBodySchema>;
    Querystring: Static<typeof requestQuerystringSchema>;
  }>({
    method: "POST",
    url: "/contract/:chain/:contractAddress/erc20/transfer",
    schema: {
      summary: "Transfer tokens",
      description:
        "Transfer ERC-20 tokens from the caller wallet to a specific wallet.",
      tags: ["ERC20"],
      operationId: "erc20-transfer",
      body: requestBodySchema,
      params: requestSchema,
      headers: walletWithAAHeaderSchema,
      querystring: requestQuerystringSchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: transactionWritesResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain, contractAddress } = request.params;
      const { simulateTx } = request.query;
      const { toAddress, amount, txOverrides } = request.body;
      const {
        "x-backend-wallet-address": walletAddress,
        "x-account-address": accountAddress,
        "x-idempotency-key": idempotencyKey,
        "x-account-factory-address": accountFactoryAddress,
        "x-account-salt": accountSalt,
      } = request.headers as Static<typeof walletWithAAHeaderSchema>;

      const chainId = await getChainIdFromChain(chain);
      const contract = await getContract({
        client: thirdwebClient,
        chain: await getChain(chainId),
        address: contractAddress,
      });

      const transaction = transfer({
        contract,
        to: getChecksumAddress(toAddress),
        amount,
      });

      const queueId = await queueTransaction({
        transaction,
        fromAddress: getChecksumAddress(walletAddress),
        toAddress: getChecksumAddress(contractAddress),
        accountAddress: getChecksumAddress(accountAddress),
        accountFactoryAddress: getChecksumAddress(accountFactoryAddress),
        accountSalt,
        txOverrides,
        idempotencyKey,
        shouldSimulate: simulateTx,
        functionName: "transfer",
        extension: "erc20",
      });

      reply.status(StatusCodes.OK).send({
        result: {
          queueId,
        },
      });
    },
  });
}
