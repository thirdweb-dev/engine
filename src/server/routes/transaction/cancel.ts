import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { Hex, defineChain } from "thirdweb";
import { WebhooksEventTypes } from "../../../schema/webhooks";
import { msSince } from "../../../utils/date";
import { reportUsage } from "../../../utils/usage";
import { enqueueWebhook } from "../../../worker/queues/sendWebhookQueue";
import { standardResponseSchema } from "../../schemas/sharedApiSchemas";
import {
  CancelledTransaction,
  QueuedTransaction,
  SentTransaction,
  sendCancellationTransaction,
} from "../../utils/transaction";

// INPUT
const requestBodySchema = Type.Object({
  queueId: Type.String({
    description: "Transaction queue ID",
    examples: ["9eb88b00-f04f-409b-9df7-7dcc9003bc35"],
  }),
});

// OUTPUT
export const responseBodySchema = Type.Object({
  result: Type.Object({
    queueId: Type.String({
      description: "Transaction queue ID",
      examples: ["9eb88b00-f04f-409b-9df7-7dcc9003bc35"],
    }),
    status: Type.String({
      description: "Response status",
      examples: ["success, error"],
    }),
    message: Type.String({
      description: "Response message",
      examples: ["Transaction cancelled on-chain successfully"],
    }),
    transactionHash: Type.Optional(
      Type.String({
        description: "Transaction hash of the on-chain cancel transaction",
        examples: [
          "0x0514076b5b7e3062c8dc17e10f7c0befe88e6efb7e97f16e3c14afb36c296467",
        ],
      }),
    ),
  }),
});

responseBodySchema.example = {
  result: {
    queueId: "a20ed4ce-301d-4251-a7af-86bd88f6c015",
    status: "success",
  },
};

export async function cancelTransaction(fastify: FastifyInstance) {
  fastify.route<{
    Body: Static<typeof requestBodySchema>;
    Reply: Static<typeof responseBodySchema>;
  }>({
    method: "POST",
    url: "/transaction/cancel",
    schema: {
      summary: "Cancel transaction",
      description:
        "Attempt to cancel a transaction by sending a null transaction with a higher gas setting. This transaction is not guaranteed to be cancelled.",
      tags: ["Transaction"],
      operationId: "cancel",
      body: requestBodySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseBodySchema,
      },
    },
    handler: async (request, reply) => {
      const { queueId } = request.body;

      // @TODO: Handle cases that can't be cancelled.

      // @TODO: Get a queued or sent transaction
      // @ts-ignore
      const transaction: QueuedTransaction | SentTransaction = {};

      let message: string;
      let transactionHash: Hex | undefined;
      if ("sentAt" in transaction) {
        // Cancel a sent transaction.
        const { chainId, from, nonce } = transaction;
        const chain = defineChain(chainId);

        // Send the cancellation transaction with the same nonce.
        transactionHash = await sendCancellationTransaction({
          chainId,
          from,
          nonce,
        });
        message = "Transaction cancelled.";

        // @TODO: update DB.
        // Send webhook and analytics.
        console.log(`Cancel transaction sent: ${transactionHash}`);
        const cancelledTransaction: CancelledTransaction = {
          ...transaction,
          transactionHash,
          cancelledAt: new Date(),
        };
        await enqueueWebhook({
          type: WebhooksEventTypes.CANCELLED_TX,
          queueId: cancelledTransaction.queueId,
        });
        _reportUsageSuccess(cancelledTransaction);
      } else {
        // Cancel an unsent transaction.
        // @TODO: update DB
        message = "@TODO";
      }

      return reply.status(StatusCodes.OK).send({
        result: {
          queueId,
          status: "success",
          message,
          transactionHash,
        },
      });
    },
  });
}

const _reportUsageSuccess = (cancelledTransaction: CancelledTransaction) => {
  const chain = defineChain(cancelledTransaction.chainId);
  reportUsage([
    {
      action: "cancel_tx",
      input: {
        ...cancelledTransaction,
        provider: chain.rpc,
        msSinceQueue: msSince(cancelledTransaction.queuedAt),
        msSinceSend:
          "sentAt" in cancelledTransaction
            ? msSince(cancelledTransaction.sentAt)
            : undefined,
      },
    },
  ]);
};
