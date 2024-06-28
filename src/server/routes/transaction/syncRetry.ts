import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { defineChain } from "thirdweb";
import { WebhooksEventTypes } from "../../../schema/webhooks";
import { getAccount } from "../../../utils/account";
import { getBlockNumberish } from "../../../utils/block";
import { msSince } from "../../../utils/date";
import { reportUsage } from "../../../utils/usage";
import { enqueueConfirmTransaction } from "../../../worker/queues/confirmTransactionQueue";
import { enqueueWebhook } from "../../../worker/queues/sendWebhookQueue";
import { _populateTransaction } from "../../../worker/tasks/sendTransactionWorker";
import { standardResponseSchema } from "../../schemas/sharedApiSchemas";
import { PreparedTransaction, SentTransaction } from "../../utils/transaction";

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

      // if (
      //   // Already mined.
      //   tx.minedAt ||
      //   // Not yet sent.
      //   !tx.sentAt ||
      //   // Missing expected values.
      //   !tx.id ||
      //   !tx.queuedAt ||
      //   !tx.chainId ||
      //   !tx.toAddress ||
      //   !tx.fromAddress ||
      //   !tx.data ||
      //   !tx.value ||
      //   !tx.nonce ||
      //   !tx.maxFeePerGas ||
      //   !tx.maxPriorityFeePerGas
      // ) {
      //   throw createCustomError(
      //     "Transaction is not in a valid state.",
      //     StatusCodes.BAD_REQUEST,
      //     "CANNOT_RETRY_TX",
      //   );
      // }

      // @ts-ignore
      // @TODO populate this
      const preparedTransaction: PreparedTransaction = {};
      const { chainId, from } = preparedTransaction;

      const chain = defineChain(chainId);
      const populatedTransaction = await _populateTransaction(
        preparedTransaction,
      );

      // Send the transaction.
      const account = await getAccount({ chainId, from });
      const { transactionHash } = await account.sendTransaction(
        populatedTransaction,
      );

      // Enqueue a ConfirmTransaction job.
      console.log(
        `Transaction sent with hash ${transactionHash}. Confirming transaction...`,
      );
      const sentTransaction: SentTransaction = {
        ...preparedTransaction,
        sentAt: new Date(),
        sentAtBlock: await getBlockNumberish(chainId),
        transactionHash,
      };
      await enqueueConfirmTransaction({ sentTransaction });

      // Send webhook and analytics.
      await enqueueWebhook({
        type: WebhooksEventTypes.SENT_TX,
        queueId: sentTransaction.queueId,
      });
      reportUsage([
        {
          action: "send_tx",
          input: {
            ...sentTransaction,
            provider: chain.rpc,
            msSinceQueue: msSince(sentTransaction.queuedAt),
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
