import { FastifyInstance } from 'fastify';
import { StatusCodes } from 'http-status-codes';
import { Static } from '@sinclair/typebox';
import { getSDK } from '../../../helpers/sdk';
import { partialRouteSchema, schemaTypes } from '../../../sharedApiSchemas';
import { logger } from '../../../utilities/logger';
import { writeRequestBodySchema, writeSchema } from '../../../schemas/contract/write';

export async function writeToContract(fastify: FastifyInstance) {
  fastify.route<writeSchema>({
    method: 'POST',
    url: '/contract/:chain_name_or_id/:contract_address/write',
    schema: {
      description: 'Write to Contract',
      tags: ['Contract'],
      operationId: 'write',
      ...partialRouteSchema,
      body: writeRequestBodySchema,
    },
    handler: async (request, reply) => {
      const { chain_name_or_id, contract_address } = request.params;
      const { function_name, args } = request.body;
      
      logger.info('Inside Write Function');
      logger.silly(`Chain : ${chain_name_or_id}`)
      logger.silly(`Contract Address : ${contract_address}`);

      logger.silly(`Function Name : ${function_name}`)
      logger.silly(`Contract Address : ${contract_address}`);
      logger.silly(`Function Arguments : ${args}`);

      const sdk = await getSDK(chain_name_or_id);
      const contract:any = await sdk.getContract(contract_address);
      
      const returnData: any = await contract.call(function_name, args);
      
      reply.status(StatusCodes.OK).send({
        result: {
          transaction: returnData?.receipt
        }
      });
    },
  });
}