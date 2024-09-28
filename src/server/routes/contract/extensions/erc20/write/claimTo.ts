import { Type, type Static } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import type { Address } from "thirdweb";
import { claimTo } from "thirdweb/extensions/erc20";
import { getContractV5 } from "../../../../../../utils/cache/getContractv5";
import { queueTransaction } from "../../../../../../utils/transaction/queueTransation";
import {
  erc20ContractParamSchema,
  requestQuerystringSchema,
  standardResponseSchema,
  transactionWritesResponseSchema,
} from "../../../../../schemas/sharedApiSchemas";
import { txOverridesWithValueSchema } from "../../../../../schemas/txOverrides";
import {
  maybeAddress,
  requiredAddress,
  walletWithAAHeaderSchema,
} from "../../../../../schemas/wallet";
import { getChainIdFromChain } from "../../../../../utils/chain";

// INPUTS
const requestSchema = erc20ContractParamSchema;
const requestBodySchema = Type.Object({
  recipient: Type.String({
    description: "The wallet address to receive the claimed tokens.",
  }),
  amount: Type.String({
    description: "The amount of tokens to claim.",
  }),
  ...txOverridesWithValueSchema.properties,
});

// Example for the Request Body
requestBodySchema.examples = [
  {
    recipient: "0x3EcDBF3B911d0e9052b64850693888b008e18373",
    amount: "0.1",
  },
];

export async function erc20claimTo(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof transactionWritesResponseSchema>;
    Body: Static<typeof requestBodySchema>;
    Querystring: Static<typeof requestQuerystringSchema>;
  }>({
    method: "POST",
    url: "/contract/:chain/:contractAddress/erc20/claim-to",
    schema: {
      summary: "Claim tokens to wallet",
      description: "Claim ERC-20 tokens to a specific wallet.",
      tags: ["ERC20"],
      operationId: "erc20-claimTo",
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
      const { chain, contractAddress } = request.params;
      const { simulateTx } = request.query;
      const { recipient, amount, txOverrides } = request.body;
      const {
        "x-backend-wallet-address": fromAddress,
        "x-account-address": accountAddress,
        "x-idempotency-key": idempotencyKey,
        "x-account-factory-address": accountFactoryAddress,
      } = request.headers as Static<typeof walletWithAAHeaderSchema>;

      const chainId = await getChainIdFromChain(chain);
      const contract = await getContractV5({
        chainId,
        contractAddress,
      });
      const transaction = claimTo({
        contract,
        from: fromAddress as Address,
        to: recipient,
        quantity: amount,
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
        txOverrides,
        idempotencyKey,
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
