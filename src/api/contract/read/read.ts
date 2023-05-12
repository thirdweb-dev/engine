import { FastifyInstance, RouteGenericInterface } from 'fastify';
import { StatusCodes } from 'http-status-codes';
import { getSDK } from '../../../helpers/sdk';
import { Static } from '@sinclair/typebox';
import { replyBodySchema, requestParamSchema, requestQuerySchema, fullRouteSchema } from '../../../sharedApiSchemas';
import { logger } from '../../../utilities/logger';

interface schemaTypes extends RouteGenericInterface {
  Params: Static<typeof requestParamSchema>;
  Querystring: Static<typeof requestQuerySchema>;
  Reply: Static<typeof replyBodySchema>;
}

export async function readContract(fastify: FastifyInstance) {
  fastify.route<schemaTypes>({
    method: 'GET',
    url: '/contract/:chain_name_or_id/:contract_address/read',
    schema: {
      description: 'Read From Contract',
      tags: ['read'],
      operationId: 'read',
      ...fullRouteSchema,
    },
    handler: async (request, reply) => {
      const { chain_name_or_id, contract_address } = request.params;
      const { function_name, args } = request.query;
      logger.info('Inside Read Function');
      logger.silly(`Chain : ${chain_name_or_id}`)
      logger.silly(`Contract Address : ${contract_address}`);

      logger.silly(`Function Name : ${function_name}`)
      logger.silly(`Args : ${args}`);

      const sdk = await getSDK(chain_name_or_id);
      const contract = await sdk.getContract(contract_address);

      const returnData: any = await contract.call(function_name, args ? args.split(',') : []);
      
      reply.status(StatusCodes.OK).send({
        result: {
          data: returnData
        },
        error: null,
      });
    },
  });
}
