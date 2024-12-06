import { Type, type Static } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import {
  toSerializableTransaction,
  toTokens,
  type Address,
  type Hex,
} from "thirdweb";
import { getChainMetadata } from "thirdweb/chains";
import { getWalletBalance } from "thirdweb/wallets";
import { getAccount } from "../../../utils/account";
import { getChain } from "../../../utils/chain";
import { logger } from "../../../utils/logger";
import { getChecksumAddress } from "../../../utils/primitiveTypes";
import { thirdwebClient } from "../../../utils/sdk";
import type { PopulatedTransaction } from "../../../utils/transaction/types";
import { createCustomError } from "../../middleware/error";
import { AddressSchema, TransactionHashSchema } from "../../schemas/address";
import { TokenAmountStringSchema } from "../../schemas/number";
import {
  requestQuerystringSchema,
  standardResponseSchema,
} from "../../schemas/sharedApiSchemas";
import { txOverridesSchema } from "../../schemas/txOverrides";
import {
  walletHeaderSchema,
  walletWithAddressParamSchema,
} from "../../schemas/wallet";
import { getChainIdFromChain } from "../../utils/chain";
import { parseTransactionOverrides } from "../../utils/transactionOverrides";

const ParamsSchema = Type.Omit(walletWithAddressParamSchema, ["walletAddress"]);

const requestBodySchema = Type.Object({
  toAddress: {
    ...AddressSchema,
    description: "Address to withdraw all funds to",
  },
  ...txOverridesSchema.properties,
});

const responseBodySchema = Type.Object({
  result: Type.Object({
    transactionHash: TransactionHashSchema,
    amount: TokenAmountStringSchema,
  }),
});

export async function withdraw(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof ParamsSchema>;
    Reply: Static<typeof responseBodySchema>;
    Body: Static<typeof requestBodySchema>;
    Querystring: Static<typeof requestQuerystringSchema>;
  }>({
    method: "POST",
    url: "/backend-wallet/:chain/withdraw",
    schema: {
      summary: "Withdraw funds",
      description: "Withdraw all funds from this wallet to another wallet.",
      tags: ["Backend Wallet"],
      operationId: "withdraw",
      params: ParamsSchema,
      body: requestBodySchema,
      headers: walletHeaderSchema,
      querystring: requestQuerystringSchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseBodySchema,
      },
    },
    handler: async (request, reply) => {
      const { chain: chainQuery } = request.params;
      const { toAddress, txOverrides } = request.body;
      const { "x-backend-wallet-address": walletAddress } =
        request.headers as Static<typeof walletHeaderSchema>;

      const chainId = await getChainIdFromChain(chainQuery);
      const chain = await getChain(chainId);
      const from = getChecksumAddress(walletAddress);

      // Populate a transfer transaction with 2x gas.
      const populatedTransaction = await toSerializableTransaction({
        from,
        transaction: {
          to: toAddress,
          chain,
          client: thirdwebClient,
          data: "0x",
          // Dummy value, replaced below.
          value: 1n,
          ...parseTransactionOverrides(txOverrides).overrides,
        },
      });

      // Compute the maximum amount to withdraw taking into account gas fees.
      const value = await getWithdrawValue(from, populatedTransaction);
      populatedTransaction.value = value;

      const account = await getAccount({ chainId, from });
      let transactionHash: Hex | undefined;
      try {
        const res = await account.sendTransaction(populatedTransaction);
        transactionHash = res.transactionHash;
      } catch (e) {
        logger({
          level: "warn",
          message: `Error withdrawing funds: ${e}`,
          service: "server",
        });

        const metadata = await getChainMetadata(chain);
        throw createCustomError(
          `Insufficient ${metadata.nativeCurrency?.symbol} on ${metadata.name} in ${from}. Try again when network gas fees are lower. See: https://portal.thirdweb.com/engine/troubleshooting`,
          StatusCodes.BAD_REQUEST,
          "INSUFFICIENT_FUNDS",
        );
      }

      reply.status(StatusCodes.OK).send({
        result: {
          transactionHash,
          amount: toTokens(value, 18),
        },
      });
    },
  });
}

const getWithdrawValue = async (
  from: Address,
  populatedTransaction: PopulatedTransaction,
): Promise<bigint> => {
  const chain = await getChain(populatedTransaction.chainId);

  // Get wallet balance.
  const { value: balanceWei } = await getWalletBalance({
    address: from,
    client: thirdwebClient,
    chain,
  });

  // Set the withdraw value to be the amount of gas that isn't reserved to send the transaction.
  const gasPrice =
    populatedTransaction.maxFeePerGas ?? populatedTransaction.gasPrice;
  if (!gasPrice) {
    throw new Error("Unable to estimate gas price for withdraw request.");
  }

  const transferCostWei = populatedTransaction.gas * gasPrice;
  return balanceWei - transferCostWei;
};
