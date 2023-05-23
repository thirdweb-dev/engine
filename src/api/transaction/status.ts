import { FastifyInstance } from 'fastify';
import { StatusCodes } from 'http-status-codes';
import {
    txStatusRouteSchema,
    txStatusSchema,
    txStatusReplyBodySchema
} from '../../schemas/transaction/status';
import {
    connectToDB,
    findTxDetailsWithQueueId
} from '../../helpers';

export async function checkTxStatus(fastify: FastifyInstance) {
  fastify.route<txStatusSchema>({
    method: 'GET',
    url: '/transaction/status/:tx_queue_id',
    schema: {
      description: 'Get Submitted Transaction Status',
      tags: ['Transaction'],
      operationId: 'txStatus',
      ...txStatusRouteSchema,
      response: {
        [StatusCodes.OK]: txStatusReplyBodySchema,
      },
    },
    handler: async (request, reply) => {
      const { tx_queue_id } = request.params;
      
      const dbConnection = await connectToDB();
      const returnData = await findTxDetailsWithQueueId(dbConnection, tx_queue_id, request);
      
      dbConnection.destroy();

      reply.status(StatusCodes.OK).send({
        result: {
          tx_queue_id,
          txprocessed: returnData.txprocessed!,
          txmined: returnData?.txmined!,
          txsubmitted: returnData?.txsubmitted!,
          txerrored: returnData?.txerrored!
        }
      });
    },
  });
}
