import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { Address } from "thirdweb";
import { claimTo } from "thirdweb/extensions/erc20";
import { resolvePromisedValue } from "thirdweb/utils";
import { getContractV5 } from "../../../../../../utils/cache/getContractv5";
import { maybeBigInt } from "../../../../../../utils/primitiveTypes";
import { insertTransaction } from "../../../../../../utils/transaction/insertTransaction";
import {
  erc20ContractParamSchema,
  requestQuerystringSchema,
  standardResponseSchema,
  transactionWritesResponseSchema,
} from "../../../../../schemas/sharedApiSchemas";
import { txOverridesWithValueSchema } from "../../../../../schemas/txOverrides";
import { walletWithAAHeaderSchema } from "../../../../../schemas/wallet";
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
      operationId: "claimTo",
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
      } = request.headers as Static<typeof walletWithAAHeaderSchema>;

      const chainId = await getChainIdFromChain(chain);
      const contract = await getContractV5({
        chainId,
        contractAddress,
      });
      const transaction = claimTo({
        contract,
        to: recipient,
        quantity: amount,
      });

      let queueId: string;
      let insertedTransaction = {
        chainId,
        from: fromAddress as Address,
        to: contractAddress as Address | undefined,
        data: (await resolvePromisedValue(transaction.data)) as Hex,
        value: maybeBigInt(txOverrides?.value),
        gas: maybeBigInt(txOverrides?.gas),
        maxFeePerGas: maybeBigInt(txOverrides?.maxFeePerGas),
        maxPriorityFeePerGas: maybeBigInt(txOverrides?.maxPriorityFeePerGas),
      };

      if (accountAddress) {
        queueId = await insertTransaction({
          insertedTransaction: {
            ...insertedTransaction,
            isUserOp: true,
            accountAddress: accountAddress as Address,
            signerAddress: fromAddress as Address,
            target: contractAddress as Address | undefined,
          },
          shouldSimulate: simulateTx,
          idempotencyKey,
        });
      } else {
        queueId = await insertTransaction({
          insertedTransaction: {
            ...insertedTransaction,
            isUserOp: false,
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
