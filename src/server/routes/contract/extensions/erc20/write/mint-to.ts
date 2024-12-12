import { Type, type Static } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getContract } from "thirdweb";
import { mintTo } from "thirdweb/extensions/erc20";
import { getChain } from "../../../../../../shared/utils/chain";
import { thirdwebClient } from "../../../../../../shared/utils/sdk";
import { queueTransaction } from "../../../../../../shared/utils/transaction/queue-transation";
import { AddressSchema } from "../../../../../schemas/address";
import {
  erc20ContractParamSchema,
  requestQuerystringSchema,
  standardResponseSchema,
  transactionWritesResponseSchema,
} from "../../../../../schemas/shared-api-schemas";
import { txOverridesWithValueSchema } from "../../../../../schemas/tx-overrides";
import {
  maybeAddress,
  requiredAddress,
  walletWithAAHeaderSchema,
} from "../../../../../schemas/wallet";
import { getChainIdFromChain } from "../../../../../utils/chain";
import { getTransactionCredentials } from "../../../../../../shared/lib/transaction/transaction-credentials";

// INPUTS
const requestSchema = erc20ContractParamSchema;
const requestBodySchema = Type.Object({
  toAddress: {
    ...AddressSchema,
    description: "Address of the wallet to mint tokens to",
  },
  amount: Type.String({
    description: "The amount of tokens you want to send",
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

export async function erc20mintTo(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof transactionWritesResponseSchema>;
    Body: Static<typeof requestBodySchema>;
    Querystring: Static<typeof requestQuerystringSchema>;
  }>({
    method: "POST",
    url: "/contract/:chain/:contractAddress/erc20/mint-to",
    schema: {
      summary: "Mint tokens",
      description: "Mint ERC-20 tokens to a specific wallet.",
      tags: ["ERC20"],
      operationId: "erc20-mintTo",
      params: requestSchema,
      body: requestBodySchema,
      headers: walletWithAAHeaderSchema,
      querystring: requestQuerystringSchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: transactionWritesResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain: _chain, contractAddress } = request.params;
      const { simulateTx } = request.query;
      const { toAddress, amount, txOverrides } = request.body;
      const {
        "x-backend-wallet-address": fromAddress,
        "x-account-address": accountAddress,
        "x-idempotency-key": idempotencyKey,
        "x-account-factory-address": accountFactoryAddress,
        "x-account-salt": accountSalt,
      } = request.headers as Static<typeof walletWithAAHeaderSchema>;

      const chainId = await getChainIdFromChain(_chain);
      const chain = await getChain(chainId);

      const contract = getContract({
        chain,
        client: thirdwebClient,
        address: contractAddress,
      });
      const transaction = mintTo({
        contract,
        to: toAddress,
        amount,
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
        credentials: getTransactionCredentials(request),
        extension: "erc20",
        functionName: "mintTo",
      });

      reply.status(StatusCodes.OK).send({
        result: {
          queueId,
        },
      });
    },
  });
}
