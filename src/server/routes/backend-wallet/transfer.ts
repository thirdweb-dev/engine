import { Static, Type } from "@sinclair/typebox";
import { constants } from "ethers";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import {
  Address,
  NATIVE_TOKEN_ADDRESS,
  ZERO_ADDRESS,
  getContract,
  toWei,
} from "thirdweb";
import { transfer as transferERC20 } from "thirdweb/extensions/erc20";
import { isContractDeployed } from "thirdweb/utils";
import { getChain } from "../../../utils/chain";
import { resolvePromisedValue } from "../../../utils/resolvePromisedValue";
import { thirdwebClient } from "../../../utils/sdk";
import { insertTransaction } from "../../../utils/transaction/insertTransaction";
import { InsertedTransaction } from "../../../utils/transaction/types";
import { createCustomError } from "../../middleware/error";
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
    default: constants.AddressZero,
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
        "x-backend-wallet-address": walletAddress,
        "x-idempotency-key": idempotencyKey,
      } = request.headers as Static<typeof walletHeaderSchema>;
      const { simulateTx: shouldSimulate } = request.query;

      // Resolve inputs.
      const currencyAddress = _currencyAddress.toLowerCase();
      const chainId = await getChainIdFromChain(chain);
      const gasOverrides = {
        gas: txOverrides?.gas ? BigInt(txOverrides.gas) : undefined,
        maxFeePerGas: txOverrides?.maxFeePerGas
          ? BigInt(txOverrides.maxFeePerGas)
          : undefined,
        maxPriorityFeePerGas: txOverrides?.maxPriorityFeePerGas
          ? BigInt(txOverrides.maxPriorityFeePerGas)
          : undefined,
      };

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
          ...gasOverrides,
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
          ...gasOverrides,
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
