import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { Static, Type } from "@sinclair/typebox";
import { connectWithDatabase } from "../../../core";
import { createCustomError } from "../../../core/error/customError";
import {
  standardResponseSchema,
} from "../../helpers/sharedApiSchemas";
import { findTxDetailsWithQueueId } from "../../helpers";
import { TransactionStatusEnum } from "../../schemas/transaction";

// INPUT
const requestSchema = Type.Object({
  tx_queue_id: Type.String({
    description: "Transaction Queue ID",
    examples: ["9eb88b00-f04f-409b-9df7-7dcc9003bc35"],
  }),
});

// OUTPUT
export const responseBodySchema = Type.Object({
  result: Type.Object({
    queueId: Type.String(),
    status: Type.String(),
    txHash: Type.Optional(Type.String()),
    submittedTxNonce: Type.Optional(Type.Number()),
    createdTimestamp: Type.Optional(Type.String()),
    txSubmittedTimestamp: Type.Optional(Type.String()),
  }),
});

responseBodySchema.examples = [{
  result: {
    queueId: "9eb88b00-f04f-409b-9df7-7dcc9003bc35",
    status: "submitted",
    txHash: "0x0e397d1459353ffa32a6e86ab85b3d60c8840975a96c936f3066022d22c3633f", 
  }
}];

// OUTPUT

export async function checkTxStatus(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof responseBodySchema>;
  }>({
    method: "GET",
    url: "/transaction/status/:tx_queue_id",
    schema: {
      description: "Get Submitted Transaction Status",
      tags: ["Transaction"],
      operationId: "txStatus",
      params: requestSchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseBodySchema,
      },
    },
    handler: async (request, reply) => {
      const { tx_queue_id } = request.params;
      const returnData = await findTxDetailsWithQueueId(
        tx_queue_id,
        request,
      );

      if (!returnData) {
        const error = createCustomError(
          `Transaction not found with queueId ${tx_queue_id}`,
          StatusCodes.NOT_FOUND,
          "TX_NOT_FOUND",
        );
        throw error;
      }

      reply.status(StatusCodes.OK).send({
        result: {
          queueId: tx_queue_id,
          status: returnData.status as TransactionStatusEnum,
          createdTimestamp: returnData.createdTimestamp,
          txSubmittedTimestamp: returnData.txSubmittedTimestamp ?? undefined,
          submittedTxNonce: returnData.submittedTxNonce ?? undefined,
          txHash: returnData.txHash ?? undefined,
        },
      });
    },
  });
}
