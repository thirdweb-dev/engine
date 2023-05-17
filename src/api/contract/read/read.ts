import { FastifyInstance } from 'fastify';
import { StatusCodes } from 'http-status-codes';
import { Static } from '@sinclair/typebox';
import { getSDK } from '../../../helpers/sdk';
import { partialRouteSchema, schemaTypes } from '../../../sharedApiSchemas';
import { logger } from '../../../utilities/logger';
import { readRequestBodySchema } from '../../../schemas/contract/read';
import { bigNumberReplacer } from '../../../utilities/convertor';

interface readSchema extends schemaTypes {
  Body: Static<typeof readRequestBodySchema>;
}

export async function readContract(fastify: FastifyInstance) {
  fastify.route<readSchema>({
    method: 'POST',
    url: '/contract/:chain_name_or_id/:contract_address/read',
    schema: {
      description: 'Read From Contract',
      tags: ['Contract'],
      operationId: 'read',
      ...partialRouteSchema,
      body: readRequestBodySchema,
    },
    handler: async (request, reply) => {
      const { chain_name_or_id, contract_address } = request.params;
      const { function_name, args } = request.body;
      logger.info('Inside Read Function');
      logger.silly(`Chain : ${chain_name_or_id}`)
      logger.silly(`Contract Address : ${contract_address}`);

      logger.silly(`Function Name : ${function_name}`)
      logger.silly(`Args : ${args}`);

      const sdk = await getSDK(chain_name_or_id);
      const contract = await sdk.getContract(contract_address);

      let returnData = await contract.call(function_name, args);
      returnData = bigNumberReplacer(returnData);
      
      reply.status(StatusCodes.OK).send({
        result: {
          data: returnData
        },
        error: null,
      });
    },
  });
}
