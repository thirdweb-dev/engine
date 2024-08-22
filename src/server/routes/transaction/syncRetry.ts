import { TransactionResponse } from "@ethersproject/abstract-provider";
import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { prisma } from "../../../db/client";
import { updateTx } from "../../../db/transactions/updateTx";
import { getSdk } from "../../../utils/cache/getSdk";
import { parseTxError } from "../../../utils/errors";
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
        !tx.nonce ||
        !tx.maxFeePerGas ||
        !tx.maxPriorityFeePerGas
      ) {
        throw createCustomError(
          "Transaction is not in a valid state.",
          StatusCodes.BAD_REQUEST,
          "CANNOT_RETRY_TX",
        );
      }

      // Get signer.
      const sdk = await getSdk({
        chainId: Number(tx.chainId),
        walletAddress: tx.fromAddress,
      });
      const signer = sdk.getSigner();
      if (!signer) {
        throw createCustomError(
          "Backend wallet not found.",
          StatusCodes.BAD_REQUEST,
          "BACKEND_WALLET_NOT_FOUND",
        );
      }

      const blockNumber = await sdk.getProvider().getBlockNumber();

      // Send transaction and get the transaction hash.
      const txRequest = {
        to: tx.toAddress,
        from: tx.fromAddress,
        data: tx.data,
        value: tx.value,
        nonce: tx.nonce,
        maxFeePerGas: maxFeePerGas ?? tx.maxFeePerGas,
        maxPriorityFeePerGas: maxPriorityFeePerGas ?? tx.maxPriorityFeePerGas,
      };

      let txResponse: TransactionResponse;
      try {
        txResponse = await signer.sendTransaction(txRequest);
        if (!txResponse) {
          throw "Missing transaction response.";
        }
      } catch (e) {
        const errorMessage = await parseTxError(tx, e);
        throw createCustomError(
          errorMessage,
          StatusCodes.BAD_REQUEST,
          "TRANSACTION_RETRY_FAILED",
        );
      }
      const transactionHash = txResponse.hash;

      // Update DB.
      await updateTx({
        queueId: tx.id,
        data: {
          status: TransactionStatus.Sent,
          transactionHash,
          res: txRequest,
          sentAt: new Date(),
          sentAtBlockNumber: blockNumber,
        },
      });

      reply.status(StatusCodes.OK).send({
        result: {
          transactionHash,
        },
      });
    },
  });
}
