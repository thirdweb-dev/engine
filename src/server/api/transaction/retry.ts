import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { retryTx } from "../../../db/transactions/retryTx";
import { standardResponseSchema } from "../../schemas/sharedApiSchemas";

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
    Body: Static<typeof requestBodySchema>;
    Reply: Static<typeof responseBodySchema>;
  }>({
    method: "POST",
    url: "/transaction/retry",
    schema: {
      summary: "Retry transaction",
      description: "Retry a transaction with updated gas settings.",
      tags: ["Transaction"],
      operationId: "retry",
      body: requestBodySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseBodySchema,
      },
    },
    handler: async (request, reply) => {
      const { queueId, maxFeePerGas, maxPriorityFeePerGas } = request.body;

      await retryTx({
        queueId: queueId,
        maxFeePerGas,
        maxPriorityFeePerGas,
      });

      reply.status(StatusCodes.OK).send({
        result: {
          message: `Transaction gas values updated for queueId: ${queueId}`,
          status: "success",
        },
      });
    },
  });
}
