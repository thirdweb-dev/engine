import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { updateTransactionGasValues } from "../../helpers";
import { standardResponseSchema } from "../../helpers/sharedApiSchemas";

// INPUT
const requestSchema = Type.Object({
  tx_queue_id: Type.String({
    description: "Transaction Queue ID",
    examples: ["9eb88b00-f04f-409b-9df7-7dcc9003bc35"],
  }),
});

const requestBodySchema = Type.Object({
  maxFeePerGas: Type.String(),
  maxPriorityFeePerGas: Type.String(),
});

// OUTPUT
export const responseBodySchema = Type.Object({
  result: Type.Object({
    message: Type.String(),
    status: Type.String(),
  }),
});

responseBodySchema.example = {
  result: {
    message:
      "Transaction gas values updated for queueId: a20ed4ce-301d-4251-a7af-86bd88f6c015",
    status: "success",
  },
};

export async function retryTransaction(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Body: Static<typeof requestBodySchema>;
    Reply: Static<typeof responseBodySchema>;
  }>({
    method: "POST",
    url: "/transaction/retry/:tx_queue_id",
    schema: {
      description: "Retry Transaction with custom gas values",
      tags: ["Transaction"],
      operationId: "txRetry",
      params: requestSchema,
      body: requestBodySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseBodySchema,
      },
    },
    handler: async (request, reply) => {
      const { tx_queue_id } = request.params;
      const { maxFeePerGas, maxPriorityFeePerGas } = request.body;
      await updateTransactionGasValues(
        request,
        tx_queue_id,
        maxFeePerGas,
        maxPriorityFeePerGas,
      );

      reply.status(StatusCodes.OK).send({
        result: {
          message: `Transaction gas values updated for queueId: ${tx_queue_id}`,
          status: "success",
        },
      });
    },
  });
}
