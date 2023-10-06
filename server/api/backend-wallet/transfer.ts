import { Static, Type } from "@sinclair/typebox";
import {
  fetchCurrencyValue,
  isNativeToken,
  normalizePriceValue,
} from "@thirdweb-dev/sdk";
import { constants } from "ethers";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { queueNativeTokenTransferTx } from "../../../src/db/transactions/queueNativeTokenTransferTx";
import { queueTx } from "../../../src/db/transactions/queueTx";
import {
  standardResponseSchema,
  transactionWritesResponseSchema,
} from "../../helpers/sharedApiSchemas";
import { walletAuthSchema, walletParamSchema } from "../../schemas/wallet";
import { getChainIdFromChain } from "../../utilities/chain";
import { getContract } from "../../utils/cache/getContract";
import { getSdk } from "../../utils/cache/getSdk";

// INPUTS
const requestSchema = Type.Omit(walletParamSchema, ["wallet_address"]);
const requestBodySchema = Type.Object({
  to: Type.String({
    description: "Address of the wallet to transfer to",
  }),
  currency_address: Type.String({
    description: "Address of the token to transfer",
    default: [constants.AddressZero],
  }),
  amount: Type.String({
    description: "The amount of tokens to transfer",
  }),
});

export async function transfer(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof transactionWritesResponseSchema>;
    Body: Static<typeof requestBodySchema>;
  }>({
    method: "POST",
    url: "/backend-wallet/:chain/transfer",
    schema: {
      summary: "Transfer",
      description:
        "Transfer native or ERC20 tokens from this wallet to another wallet",
      tags: ["Backend Wallet"],
      operationId: "backendWallet_transfer",
      params: requestSchema,
      body: requestBodySchema,
      headers: walletAuthSchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: transactionWritesResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain } = request.params;
      const { to, amount, currency_address } = request.body;
      const walletAddress = request.headers[
        "x-backend-wallet-address"
      ] as string;
      let queueId: string | null = null;
      const accountAddress = request.headers["x-account-address"] as string;
      const chainId = getChainIdFromChain(chain);
      const sdk = await getSdk({ chainId, walletAddress, accountAddress });

      const normalizedValue = await normalizePriceValue(
        sdk.getProvider(),
        amount,
        currency_address,
      );

      if (isNativeToken(currency_address)) {
        const walletAddress = await sdk.getSigner()?.getAddress();
        if (!walletAddress) throw new Error("No wallet address");

        const balance = await sdk.getBalance(walletAddress);

        if (balance.value.lt(normalizedValue)) {
          throw new Error("Insufficient balance");
        }

        queueId = await queueNativeTokenTransferTx({
          chainId,
          extension: "none",
          transferParams: {
            toAddress: to,
            fromAddress: walletAddress || accountAddress,
            value: normalizedValue.toHexString(),
            currencyAddress: currency_address,
          },
        });
      } else {
        const contract = await getContract({
          chainId,
          contractAddress: currency_address,
          walletAddress,
          accountAddress,
        });

        const { displayValue } = await fetchCurrencyValue(
          sdk.getProvider(),
          currency_address,
          normalizedValue,
        );
        const tx = await contract.erc20.transfer.prepare(to, displayValue);

        queueId = await queueTx({ tx, chainId, extension: "erc20" });
      }

      reply.status(StatusCodes.OK).send({
        result: {
          queueId,
        },
      });
    },
  });
}
