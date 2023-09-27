import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { standardResponseSchema } from "../../helpers/sharedApiSchemas";
import { cancelTransactionAndUpdate } from "../../utilities/transaction";

// INPUT
const requestSchema = Type.Object({
  queueId: Type.String({
    description: "Transaction Queue ID",
    examples: ["9eb88b00-f04f-409b-9df7-7dcc9003bc35"],
  }),
});

// OUTPUT
export const responseBodySchema = Type.Object({
  result: Type.Object({
    queueId: Type.String({
      description: "Transaction Queue ID",
      examples: ["9eb88b00-f04f-409b-9df7-7dcc9003bc35"],
    }),
    status: Type.String({
      description: "Response Status",
      examples: ["success, error"],
    }),
  }),
});

responseBodySchema.example = {
  result: {
    qeueuId: "a20ed4ce-301d-4251-a7af-86bd88f6c015",
    status: "success",
  },
};

export async function cancelTransaction(fastify: FastifyInstance) {
  fastify.route<{
    Body: Static<typeof requestSchema>;
    Reply: Static<typeof responseBodySchema>;
  }>({
    method: "POST",
    url: "/transaction/cancel",
    schema: {
      description: "Cancel Transaction",
      tags: ["Transaction"],
      operationId: "cancelTransaction",
      body: requestSchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseBodySchema,
      },
    },
    handler: async (request, reply) => {
      const { queueId } = request.body;
      const walletAddress = request.headers[
        "x-backend-wallet-address"
      ] as string;
      request.log.info(`Canceling transaction with queueId ${queueId}`);

      await cancelTransactionAndUpdate(queueId, walletAddress);

      return reply.status(StatusCodes.OK).send({
        result: {
          queueId,
          status: "success",
        },
      });
    },
  });
}
