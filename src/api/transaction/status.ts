import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { Static, Type } from "@sinclair/typebox";
import { connectWithDatabase } from "../../../core";
import { createCustomError } from "../../../core/error/customError";
import {
  baseReplyErrorSchema,
  standardResponseSchema,
} from "../../helpers/sharedApiSchemas";
import { findTxDetailsWithQueueId } from "../../helpers";

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
  }),
  error: Type.Optional(baseReplyErrorSchema),
});

enum Status {
  Processed = "processed",
  Queued = "queued",
  Submitted = "submitted",
  Errored = "errored",
  Mined = "mined",
}

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
      const dbConnection = await connectWithDatabase(request);
      const returnData = await findTxDetailsWithQueueId(
        dbConnection,
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

      let status: Status;

      if (returnData.txMined) {
        status = Status.Mined;
      } else if (returnData.txSubmitted) {
        status = Status.Submitted;
      } else if (returnData.txProcessed) {
        status = Status.Processed;
      } else if (returnData.txErrored) {
        status = Status.Errored;
      } else {
        status = Status.Queued;
      }

      dbConnection.destroy();

      reply.status(StatusCodes.OK).send({
        result: {
          queueId: tx_queue_id,
          status,
          txHash: returnData.txHash ?? undefined,
        },
      });
    },
  });
}
