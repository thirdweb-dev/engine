import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { retryTx } from "../../../src/db/transactions/retryTx";
import { standardResponseSchema } from "../../helpers/sharedApiSchemas";

// INPUT
const requestSchema = Type.Object({
  queueId: Type.String({
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
    url: "/transaction/retry/:queueId",
    schema: {
      summary: "Retry transaction",
      description: "Retry a transaction with updated gas settings.",
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
      const { queueId } = request.params;
      const { maxFeePerGas, maxPriorityFeePerGas } = request.body;

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
