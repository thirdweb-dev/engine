import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import {
  Address,
  estimateGasCost,
  prepareTransaction,
  sendTransaction,
} from "thirdweb";
import { getWalletBalance } from "thirdweb/wallets";
import { getAccount } from "../../../utils/account";
import { getChain } from "../../../utils/chain";
import { thirdwebClient } from "../../../utils/sdk";
import {
  requestQuerystringSchema,
  standardResponseSchema,
} from "../../schemas/sharedApiSchemas";
import {
  walletHeaderSchema,
  walletWithAddressParamSchema,
} from "../../schemas/wallet";
import { getChainIdFromChain } from "../../utils/chain";

const ParamsSchema = Type.Omit(walletWithAddressParamSchema, ["walletAddress"]);

const requestBodySchema = Type.Object({
  toAddress: Type.String({
    description: "Address to withdraw all funds to",
  }),
});

const responseBodySchema = Type.Object({
  result: Type.Object({
    transactionHash: Type.String(),
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
      const { toAddress } = request.body;
      const {
        "x-backend-wallet-address": walletAddress,
        "x-idempotency-key": idempotencyKey,
      } = request.headers as Static<typeof walletHeaderSchema>;

      const chainId = await getChainIdFromChain(chainQuery);
      const chain = await getChain(chainId);
      const from = walletAddress as Address;

      const account = await getAccount({ chainId, from });
      const value = await getWithdrawValue({ chainId, from });

      const transaction = prepareTransaction({
        to: toAddress,
        chain,
        client: thirdwebClient,
        value,
      });
      const { transactionHash } = await sendTransaction({
        account,
        transaction,
      });

      reply.status(StatusCodes.OK).send({
        result: {
          transactionHash,
        },
      });
    },
  });
}

const getWithdrawValue = async (args: {
  chainId: number;
  from: Address;
}): Promise<bigint> => {
  const { chainId, from } = args;
  const chain = await getChain(chainId);

  // Get wallet balance.
  const { value: balanceWei } = await getWalletBalance({
    address: from,
    client: thirdwebClient,
    chain,
  });

  // Estimate gas for a transfer.
  const transaction = prepareTransaction({
    chain,
    client: thirdwebClient,
    value: 1n, // dummy value
    to: from, // dummy value
  });
  const { wei: transferCostWei } = await estimateGasCost({ transaction });

  // Add a +20% buffer for gas variance.
  const buffer = transferCostWei / 5n;

  return balanceWei - transferCostWei - buffer;
};
