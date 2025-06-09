import { Type, type Static } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import {
  NATIVE_TOKEN_ADDRESS,
  ZERO_ADDRESS,
  getContract,
  toWei,
  type Address,
} from "thirdweb";
import { transfer as transferERC20 } from "thirdweb/extensions/erc20";
import { isContractDeployed } from "thirdweb/utils";
import { getChain } from "../../../shared/utils/chain";
import {
  getChecksumAddress,
  normalizeAddress,
} from "../../../shared/utils/primitive-types";
import { thirdwebClient } from "../../../shared/utils/sdk";
import { insertTransaction } from "../../../shared/utils/transaction/insert-transaction";
import { queueTransaction } from "../../../shared/utils/transaction/queue-transation";
import type { InsertedTransaction } from "../../../shared/utils/transaction/types";
import { createCustomError } from "../../middleware/error";
import { AddressSchema } from "../../schemas/address";
import { TokenAmountStringSchema } from "../../schemas/number";
import {
  requestQuerystringSchema,
  standardResponseSchema,
  transactionWritesResponseSchema,
} from "../../schemas/shared-api-schemas";
import { txOverridesWithValueSchema } from "../../schemas/tx-overrides";
import {
  walletWithAAHeaderSchema,
  walletWithAddressParamSchema,
} from "../../schemas/wallet";
import { getChainIdFromChain } from "../../utils/chain";
import { parseTransactionOverrides } from "../../utils/transaction-overrides";

const requestSchema = Type.Omit(walletWithAddressParamSchema, [
  "walletAddress",
]);
const requestBodySchema = Type.Object({
  to: {
    ...AddressSchema,
    description: "The recipient wallet address.",
  },
  currencyAddress: Type.Optional({
    ...AddressSchema,
    examples: [ZERO_ADDRESS],
    description:
      "The token address to transfer. Omit to transfer the chain's native currency (e.g. ETH on Ethereum).",
  }),
  amount: {
    ...TokenAmountStringSchema,
    description:
      'The amount in ether to transfer. Example: "0.1" to send 0.1 ETH.',
  },
  ...txOverridesWithValueSchema.properties,
});

export async function transfer(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof transactionWritesResponseSchema>;
    Body: Static<typeof requestBodySchema>;
    Querystring: Static<typeof requestQuerystringSchema>;
  }>({
    method: "POST",
    url: "/backend-wallet/:chain/transfer",
    schema: {
      summary: "Transfer tokens",
      description:
        "Transfer native currency or ERC20 tokens to another wallet.",
      tags: ["Backend Wallet"],
      operationId: "transfer",
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
      const { chain } = request.params;
      const {
        to,
        amount,
        currencyAddress: _currencyAddress = ZERO_ADDRESS,
        txOverrides,
      } = request.body;
      const {
        "x-backend-wallet-address": walletAddress,
        "x-idempotency-key": idempotencyKey,
        "x-account-address": accountAddress,
        "x-account-factory-address": accountFactoryAddress,
        "x-account-salt": accountSalt,
        "x-transaction-mode": transactionMode,
      } = request.headers as Static<typeof walletWithAAHeaderSchema>;
      const { simulateTx: shouldSimulate } = request.query;

      // Resolve inputs.
      const currencyAddress = normalizeAddress(_currencyAddress);
      const chainId = await getChainIdFromChain(chain);

      let queueId: string;
      if (
        currencyAddress === ZERO_ADDRESS ||
        currencyAddress === NATIVE_TOKEN_ADDRESS
      ) {
        // Native token transfer - use insertTransaction directly
        const insertedTransaction: InsertedTransaction = {
          chainId,
          from: walletAddress as Address,
          to: to as Address,
          data: "0x",
          value: toWei(amount),
          transactionMode,
          ...parseTransactionOverrides(txOverrides),
          ...(accountAddress
            ? {
                isUserOp: true,
                accountAddress: getChecksumAddress(accountAddress),
                signerAddress: getChecksumAddress(walletAddress),
                target: getChecksumAddress(to),
                accountFactoryAddress: getChecksumAddress(
                  accountFactoryAddress,
                ),
                accountSalt,
              }
            : { isUserOp: false }),
        };

        queueId = await insertTransaction({
          insertedTransaction,
          idempotencyKey,
          shouldSimulate,
        });
      } else {
        const contract = getContract({
          client: thirdwebClient,
          chain: await getChain(chainId),
          address: currencyAddress,
        });

        // Assert a valid contract. This call is cached.
        // @TODO: Replace with isTransferSupported
        const isValid = await isContractDeployed(contract);
        if (!isValid) {
          throw createCustomError(
            "Invalid currency contract.",
            StatusCodes.BAD_REQUEST,
            "INVALID_CONTRACT",
          );
        }

        // ERC20 token transfer - use queueTransaction with PreparedTransaction
        const transaction = transferERC20({ contract, to, amount });

        queueId = await queueTransaction({
          transaction,
          fromAddress: getChecksumAddress(walletAddress),
          toAddress: getChecksumAddress(to),
          accountAddress: getChecksumAddress(accountAddress),
          accountFactoryAddress: getChecksumAddress(accountFactoryAddress),
          accountSalt,
          txOverrides,
          idempotencyKey,
          shouldSimulate,
          functionName: "transfer",
          extension: "erc20",
          transactionMode,
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
