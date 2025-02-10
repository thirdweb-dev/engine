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
import { isContractDeployed, resolvePromisedValue } from "thirdweb/utils";
import { getChain } from "../../../shared/utils/chain.js";
import { normalizeAddress } from "../../../shared/utils/primitive-types.js";
import { thirdwebClient } from "../../../shared/utils/sdk.js";
import { insertTransaction } from "../../../shared/utils/transaction/insert-transaction.js";
import type { InsertedTransaction } from "../../../shared/utils/transaction/types.js";
import { createCustomError } from "../../middleware/error.js";
import { AddressSchema } from "../../schemas/address.js";
import { TokenAmountStringSchema } from "../../schemas/number.js";
import {
  requestQuerystringSchema,
  standardResponseSchema,
  transactionWritesResponseSchema,
} from "../../schemas/shared-api-schemas.js";
import { txOverridesWithValueSchema } from "../../schemas/tx-overrides.js";
import {
  walletHeaderSchema,
  walletWithAddressParamSchema,
} from "../../schemas/wallet/index.js";
import { getChainIdFromChain } from "../../utils/chain.js";
import { parseTransactionOverrides } from "../../utils/transaction-overrides.js";

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
      headers: walletHeaderSchema,
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
        "x-transaction-mode": transactionMode,
      } = request.headers as Static<typeof walletHeaderSchema>;
      const { simulateTx: shouldSimulate } = request.query;

      // Resolve inputs.
      const currencyAddress = normalizeAddress(_currencyAddress);
      const chainId = await getChainIdFromChain(chain);

      let insertedTransaction: InsertedTransaction;
      if (
        currencyAddress === ZERO_ADDRESS ||
        currencyAddress === NATIVE_TOKEN_ADDRESS
      ) {
        insertedTransaction = {
          isUserOp: false,
          chainId,
          from: walletAddress as Address,
          to: to as Address,
          data: "0x",
          value: toWei(amount),
          extension: "none",
          functionName: "transfer",
          transactionMode,
          ...parseTransactionOverrides(txOverrides),
        };
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

        const transaction = transferERC20({ contract, to, amount });

        insertedTransaction = {
          isUserOp: false,
          chainId,
          from: walletAddress as Address,
          to: (await resolvePromisedValue(transaction.to)) as
            | Address
            | undefined,
          data: await resolvePromisedValue(transaction.data),
          value: 0n,
          extension: "erc20",
          functionName: "transfer",
          functionArgs: [to, amount, currencyAddress],
          transactionMode,
          ...parseTransactionOverrides(txOverrides),
        };
      }

      const queueId = await insertTransaction({
        insertedTransaction,
        idempotencyKey,
        shouldSimulate,
      });

      reply.status(StatusCodes.OK).send({
        result: {
          queueId,
        },
      });
    },
  });
}
