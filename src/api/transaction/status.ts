import { FastifyInstance } from 'fastify';
import { StatusCodes } from 'http-status-codes';
import { Static, Type } from '@sinclair/typebox';
import {
    connectWithDatabase,
    findTxDetailsWithQueueId
} from '../../helpers';
import { createCustomError } from '../../helpers/customError';
import { baseReplyErrorSchema, standardResponseSchema } from '../../helpers/sharedApiSchemas';

const txStatusRequestParamSchema = Type.Object({
  tx_queue_id: Type.String({
    description: "Transaction Queue ID",
    examples: ["9eb88b00-f04f-409b-9df7-7dcc9003bc35"],
  }),
});

export const txStatusReplyBodySchema = Type.Object({
  result: Type.Object({
    queueId: Type.String(),
    status: Type.Object({
      processed: Type.Boolean(),
      submitted: Type.Boolean(),
      errored: Type.Boolean(),
      mined: Type.Boolean(),
      queued: Type.Boolean(),
    }),
    txHash: Type.Optional(Type.String()),
  }),
  error: Type.Optional(baseReplyErrorSchema),
});

export async function checkTxStatus(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof txStatusRequestParamSchema>;
    Reply: Static<typeof txStatusReplyBodySchema>;
  }>({
    method: 'GET',
    url: '/transaction/status/:tx_queue_id',
    schema: {
      description: 'Get Submitted Transaction Status',
      tags: ['Transaction'],
      operationId: 'txStatus',
      params: txStatusRequestParamSchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: txStatusReplyBodySchema,
      },
    },
    handler: async (request, reply) => {
      const { tx_queue_id } = request.params;
      // request.log.info("Transaction/Status Called");
      const dbConnection = await connectWithDatabase(request);
      const returnData = await findTxDetailsWithQueueId(dbConnection, tx_queue_id, request);
      
      if (!returnData) {
        const error = createCustomError(`Transaction not found with queueId ${tx_queue_id}`, StatusCodes.NOT_FOUND, 'TX_NOT_FOUND');
        throw error;
      }

      dbConnection.destroy();

      reply.status(StatusCodes.OK).send({
        result: {
          queueId: tx_queue_id,
          status: {
            processed: returnData.txProcessed!,
            mined: returnData?.txMined!,
            submitted: returnData?.txSubmitted!,
            errored: returnData?.txErrored!,
            queued: true,
          },
          txHash: returnData.txHash ?? "In-Queue",
        }
      });
    },
  });
}
