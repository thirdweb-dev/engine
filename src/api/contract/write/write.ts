import { FastifyInstance, RouteGenericInterface } from 'fastify';
import { Static } from '@sinclair/typebox';
import { StatusCodes } from 'http-status-codes';
import { getSDK } from '../../../helpers/sdk';
import { replyBodySchema, requestParamSchema, requestQuerySchema, fullRouteSchema } from '../../../sharedApiSchemas';
import { logger } from '../../../utilities/logger';

interface schemaTypes extends RouteGenericInterface {
  Params: Static<typeof requestParamSchema>;
  Querystring: Static<typeof requestQuerySchema>;
  Reply: Static<typeof replyBodySchema>;
}

export async function writeToContract(fastify: FastifyInstance) {
  fastify.route<schemaTypes>({
    method: 'POST',
    url: '/contract/:chain_or_rpc/:contract_address/write',
    schema: {
      description: 'Write From Contract',
      tags: ['write'],
      operationId: 'read',
      ...fullRouteSchema
    },
    handler: async (request, reply) => {
      const { chain_or_rpc, contract_address } = request.params;
      const { function_name, args } = request.query;
      
      logger.info('Inside Write Function');
      logger.silly(`Chain : ${chain_or_rpc}`)
      logger.silly(`Contract Address : ${contract_address}`);

      logger.silly(`Function Name : ${function_name}`)
      logger.silly(`Contract Address : ${contract_address}`);
      logger.silly(`Function Arguments : ${args}`);

      const sdk = await getSDK(chain_or_rpc);
      const contract:any = await sdk.getContract(contract_address);
      
      const returnData: any = await contract.call(function_name, args ? args.split(',') : []);
      
      reply.status(StatusCodes.OK).send({
        result: {
          transaction: returnData?.receipt
        },
        error: null,
      });
    },
  });
}