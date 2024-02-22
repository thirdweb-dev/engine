import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { standardResponseSchema } from "../../schemas/sharedApiSchemas";
import { cancelTransactionAndUpdate } from "../../utils/transaction";

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
      description: "Cancel a transaction that is not yet mined or errored.",
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

      const { message, transactionHash } = await cancelTransactionAndUpdate({
        queueId,
      });

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
