import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import {
  defineChain,
  eth_blockNumber,
  getRpcClient,
  prepareTransaction,
  sendTransaction,
} from "thirdweb";
import { ethers5Adapter } from "thirdweb/adapters/ethers5";
import { resolvePromisedValue } from "thirdweb/dist/types/utils/promise/resolve-promised-value";
import { prisma } from "../../../db/client";
import { updateTx } from "../../../db/transactions/updateTx";
import { getWallet } from "../../../utils/cache/getWallet";
import { msSince } from "../../../utils/date";
import { parseTxError } from "../../../utils/errors";
import { thirdwebClient } from "../../../utils/sdk";
import { UsageEventType, reportUsage } from "../../../utils/usage";
import { createCustomError } from "../../middleware/error";
import { standardResponseSchema } from "../../schemas/sharedApiSchemas";
import { TransactionStatus } from "../../schemas/transaction";

// INPUT
const requestBodySchema = Type.Object({
  queueId: Type.String({
    description: "Transaction queue ID",
    examples: ["9eb88b00-f04f-409b-9df7-7dcc9003bc35"],
  }),
  maxFeePerGas: Type.Optional(Type.String()),
  maxPriorityFeePerGas: Type.Optional(Type.String()),
});

// OUTPUT
export const responseBodySchema = Type.Object({
  result: Type.Object({
    transactionHash: Type.String(),
  }),
});

responseBodySchema.example = {
  result: {
    transactionHash:
      "0xc3b437073c164c33f95065fb325e9bc419f306cb39ae8b4ca233f33efaa74ead",
  },
};

export async function syncRetryTransaction(fastify: FastifyInstance) {
  fastify.route<{
    Body: Static<typeof requestBodySchema>;
    Reply: Static<typeof responseBodySchema>;
  }>({
    method: "POST",
    url: "/transaction/sync-retry",
    schema: {
      summary: "Retry transaction (synchronous)",
      description:
        "Synchronously retry a transaction with updated gas settings.",
      tags: ["Transaction"],
      operationId: "syncRetry",
      body: requestBodySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseBodySchema,
      },
    },
    handler: async (request, reply) => {
      const { queueId, maxFeePerGas, maxPriorityFeePerGas } = request.body;

      const tx = await prisma.transactions.findUnique({
        where: {
          id: queueId,
        },
      });
      if (!tx) {
        throw createCustomError(
          `Transaction not found with queueId ${queueId}`,
          StatusCodes.NOT_FOUND,
          "TX_NOT_FOUND",
        );
      }
      if (
        // Already mined.
        tx.minedAt ||
        // Not yet sent.
        !tx.sentAt ||
        // Missing expected values.
        !tx.id ||
        !tx.queuedAt ||
        !tx.chainId ||
        !tx.toAddress ||
        !tx.fromAddress ||
        !tx.data ||
        !tx.value ||
        !tx.nonce
      ) {
        throw createCustomError(
          "Transaction is not in a valid state.",
          StatusCodes.BAD_REQUEST,
          "CANNOT_RETRY_TX",
        );
      }

      const chain = defineChain(parseInt(tx.chainId));
      const rpcRequest = getRpcClient({ client: thirdwebClient, chain });
      const wallet = await getWallet({
        chainId: chain.id,
        walletAddress: tx.fromAddress,
      });
      const account = await ethers5Adapter.signer.fromEthers({
        signer: wallet.getSigner(),
      });

      // Send transaction and get the transaction hash.
      const retryTransaction = prepareTransaction({
        client: thirdwebClient,
        chain,
        to: tx.toAddress,
        data: tx.data as `0x${string}`,
        value: BigInt(tx.value),
        nonce: tx.nonce,
        maxFeePerGas: maxFeePerGas ? BigInt(maxFeePerGas) : undefined,
        maxPriorityFeePerGas: maxPriorityFeePerGas
          ? BigInt(maxPriorityFeePerGas)
          : undefined,
      });

      let transactionHash: string;
      try {
        const result = await sendTransaction({
          transaction: retryTransaction,
          account,
        });
        transactionHash = result.transactionHash;
      } catch (e) {
        const errorMessage = await parseTxError(tx, e);
        throw createCustomError(
          errorMessage,
          StatusCodes.BAD_REQUEST,
          "TRANSACTION_RETRY_FAILED",
        );
      }

      // Update DB.
      await updateTx({
        queueId: tx.id,
        data: {
          status: TransactionStatus.Sent,
          sentAt: new Date(),
          sentAtBlock: await eth_blockNumber(rpcRequest),
          transactionHash,
          nonce: tx.nonce,
          transactionType: tx.transactionType ?? 0,
          gas: await resolvePromisedValue(retryTransaction.gas),
          gasPrice: await resolvePromisedValue(retryTransaction.gasPrice),
          maxFeePerGas: await resolvePromisedValue(
            retryTransaction.maxFeePerGas,
          ),
          maxPriorityFeePerGas: await resolvePromisedValue(
            retryTransaction.maxPriorityFeePerGas,
          ),
          value: await resolvePromisedValue(retryTransaction.value),
        },
      });
      reportUsage([
        {
          action: UsageEventType.SendTx,
          data: {
            fromAddress: tx.fromAddress,
            toAddress: tx.toAddress,
            value: BigInt(tx.value),
            chainId: parseInt(tx.chainId),
            transactionHash,
            functionName: tx.functionName || undefined,
            extension: tx.extension || undefined,
            msSinceQueue: msSince(new Date(tx.queuedAt)),
          },
        },
      ]);

      reply.status(StatusCodes.OK).send({
        result: {
          transactionHash,
        },
      });
    },
  });
}
