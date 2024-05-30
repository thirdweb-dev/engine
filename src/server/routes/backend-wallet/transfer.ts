import { Static, Type } from "@sinclair/typebox";
import {
  fetchCurrencyValue,
  isNativeToken,
  normalizePriceValue,
} from "@thirdweb-dev/sdk";
import { constants } from "ethers";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { queueTx } from "../../../db/transactions/queueTx";
import { queueTxRaw } from "../../../db/transactions/queueTxRaw";
import { getContract } from "../../../utils/cache/getContract";
import { getSdk } from "../../../utils/cache/getSdk";
import { createCustomError } from "../../middleware/error";
import {
  requestQuerystringSchema,
  standardResponseSchema,
  transactionWritesResponseSchema,
} from "../../schemas/sharedApiSchemas";
import { txOverridesWithValueSchema } from "../../schemas/txOverrides";
import {
  backendWalletHeaderSchema,
  walletParamSchema,
} from "../../schemas/wallet";
import { getChainIdFromChain } from "../../utils/chain";

// INPUTS
const requestSchema = Type.Omit(walletParamSchema, ["walletAddress"]);
const requestBodySchema = Type.Object({
  to: Type.String({
    description: "Address of the wallet to transfer to",
  }),
  currencyAddress: Type.String({
    description: "Address of the token to transfer",
    default: [constants.AddressZero],
  }),
  amount: Type.String({
    description: "The amount of tokens to transfer",
  }),
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
        "Transfer native or ERC20 tokens from this wallet to another wallet",
      tags: ["Backend Wallet"],
      operationId: "transfer",
      params: requestSchema,
      body: requestBodySchema,
      headers: backendWalletHeaderSchema,
      querystring: requestQuerystringSchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: transactionWritesResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain } = request.params;
      const { to, amount, currencyAddress, txOverrides } = request.body;
      const {
        "x-backend-wallet-address": walletAddress,
        "x-idempotency-key": idempotencyKey,
      } = request.headers as Static<typeof backendWalletHeaderSchema>;
      const { simulateTx } = request.query;
      const chainId = await getChainIdFromChain(chain);
      const sdk = await getSdk({ chainId, walletAddress });

      const normalizedValue = await normalizePriceValue(
        sdk.getProvider(),
        amount,
        currencyAddress,
      );

      let queueId: string | null = null;
      if (isNativeToken(currencyAddress)) {
        const walletAddress = await sdk.getSigner()?.getAddress();
        if (!walletAddress)
          throw createCustomError(
            "No wallet address",
            StatusCodes.BAD_REQUEST,
            "NO_WALLET_ADDRESS",
          );

        const balance = await sdk.getBalance(walletAddress);

        if (balance.value.lte(normalizedValue)) {
          throw createCustomError(
            "Insufficient balance",
            StatusCodes.BAD_REQUEST,
            "INSUFFICIENT_BALANCE",
          );
        }

        const params = {
          toAddress: to,
          fromAddress: walletAddress,
          currencyAddress,
          value: normalizedValue.toHexString(),
        };

        ({ id: queueId } = await queueTxRaw({
          chainId: chainId.toString(),
          functionName: "transfer",
          functionArgs: JSON.stringify([
            params.toAddress,
            params.value,
            params.currencyAddress,
          ]),
          extension: "none",
          fromAddress: params.fromAddress,
          toAddress: params.toAddress,
          value: params.value,
          data: "0x",
          simulateTx,
          idempotencyKey,
          ...txOverrides,
        }));
      } else {
        const contract = await getContract({
          chainId,
          contractAddress: currencyAddress,
          walletAddress,
        });

        const { displayValue } = await fetchCurrencyValue(
          sdk.getProvider(),
          currencyAddress,
          normalizedValue,
        );
        const tx = await contract.erc20.transfer.prepare(to, displayValue);

        queueId = await queueTx({
          tx,
          chainId,
          extension: "erc20",
          simulateTx,
          idempotencyKey,
          txOverrides,
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
