import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getTxById } from "../../../db/transactions/getTxById";
import { updateTx } from "../../../db/transactions/updateTx";
import { getSdk } from "../../../utils/cache/getSdk";
import { msSince } from "../../../utils/date";
import { UsageEventTxActionEnum, reportUsage } from "../../../utils/usage";
import { createCustomError } from "../../middleware/error";
import { standardResponseSchema } from "../../schemas/sharedApiSchemas";
import { TransactionStatusEnum } from "../../schemas/transaction";

// INPUT
const requestBodySchema = Type.Object({
  queueId: Type.String({
    description: "Transaction queue ID",
    examples: ["9eb88b00-f04f-409b-9df7-7dcc9003bc35"],
  }),
  maxFeePerGas: Type.String(),
  maxPriorityFeePerGas: Type.String(),
});

// OUTPUT
export const responseBodySchema = Type.Object({
  result: Type.Object({
    transactionHash: Type.String(),
  }),
});

responseBodySchema.example = {
  result: {
    message:
      "Transaction gas values updated for queueId: a20ed4ce-301d-4251-a7af-86bd88f6c015",
    status: "success",
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
      const walletAddress = request.headers[
        "x-backend-wallet-address"
      ] as string;

      const tx = await getTxById({ queueId });
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
        !tx.queueId ||
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
        walletAddress,
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

      // Send transaction.
      const txRequest = {
        to: tx.toAddress,
        from: tx.fromAddress,
        data: tx.data,
        value: tx.value,
        nonce: tx.nonce,
        maxFeePerGas: maxFeePerGas ?? tx.maxFeePerGas,
        maxPriorityFeePerGas: maxPriorityFeePerGas ?? tx.maxPriorityFeePerGas,
      };
      const txResponse = await signer.sendTransaction(txRequest);
      if (!txResponse) {
        throw "Missing transaction response.";
      }
      const transactionHash = txResponse.hash;

      // Update DB.
      await updateTx({
        queueId: tx.queueId,
        data: {
          status: TransactionStatusEnum.Submitted,
          transactionHash,
          res: txRequest,
          sentAt: new Date(),
          sentAtBlockNumber: blockNumber,
        },
      });
      reportUsage([
        {
          action: UsageEventTxActionEnum.SendTx,
          input: {
            fromAddress: tx.fromAddress,
            toAddress: tx.toAddress,
            value: tx.value,
            chainId: tx.chainId,
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
