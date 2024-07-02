import { Static, Type } from "@sinclair/typebox";
import { constants } from "ethers";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { Address, NATIVE_TOKEN_ADDRESS, ZERO_ADDRESS, toWei } from "thirdweb";
import { insertTransaction } from "../../../utils/transaction/insertTransaction";
import {
  requestQuerystringSchema,
  standardResponseSchema,
  transactionWritesResponseSchema,
} from "../../schemas/sharedApiSchemas";
import { txOverridesWithValueSchema } from "../../schemas/txOverrides";
import { walletHeaderSchema, walletParamSchema } from "../../schemas/wallet";
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
        currencyAddress: _currencyAddress,
        txOverrides,
      } = request.body;
      const {
        "x-backend-wallet-address": _walletAddress,
        "x-idempotency-key": idempotencyKey,
      } = request.headers as Static<typeof walletHeaderSchema>;
      const { simulateTx } = request.query;

      // Resolve inputs.
      const chainId = await getChainIdFromChain(chain);
      const walletAddress = _walletAddress.toLowerCase();
      const currencyAddress = _currencyAddress.toLowerCase();

      let queueId: string;
      if (
        currencyAddress === ZERO_ADDRESS ||
        currencyAddress === NATIVE_TOKEN_ADDRESS
      ) {
        const value = toWei(amount);

        ({ queueId } = await insertTransaction({
          insertedTransaction: {
            chainId,
            from: walletAddress as Address,
            to: to as Address,
            data: "0x",
            value,

            gas: txOverrides?.gas ? BigInt(txOverrides.gas) : undefined,
            maxFeePerGas: txOverrides?.maxFeePerGas
              ? BigInt(txOverrides.maxFeePerGas)
              : undefined,
            maxPriorityFeePerGas: txOverrides?.maxPriorityFeePerGas
              ? BigInt(txOverrides.maxPriorityFeePerGas)
              : undefined,

            functionName: "transfer",
            functionArgs: [to, amount, currencyAddress],
            extension: "none",
          },
          idempotencyKey,
          shouldSimulate: simulateTx,
        }));
      } else {
        throw "@TODO: implement";
        // const contract = await getContract({
        //   chainId,
        //   contractAddress: currencyAddress,
        //   walletAddress,
        // });

        // const { displayValue } = await fetchCurrencyValue(
        //   sdk.getProvider(),
        //   currencyAddress,
        //   normalizedValue,
        // );
        // const tx = await contract.erc20.transfer.prepare(to, displayValue);

        // queueId = await queueTx({
        //   tx,
        //   chainId,
        //   extension: "erc20",
        //   simulateTx,
        //   idempotencyKey,
        //   txOverrides,
        // });
      }

      reply.status(StatusCodes.OK).send({
        result: {
          queueId,
        },
      });
    },
  });
}
