import { FastifyInstance } from 'fastify';
import { StatusCodes } from 'http-status-codes';

import { getSDK } from '../../../../../helpers/sdk';
import { partialRouteSchema } from '../../../../../sharedApiSchemas';
import { logger } from '../../../../../utilities/logger';
import { normalizeRequestQuerySchema, normalizeAmountRouteSchema, getReplyBodySchema } from '../../../../../schemas/erc20/standard/normalizeAmount';

export async function erc20NormalizeAmount(fastify: FastifyInstance) {
  fastify.route<normalizeAmountRouteSchema>({
    method: 'GET',
    url: '/contract/:chain_name_or_id/:contract_address/erc20/normalizeAmount',
    schema: {
      description: 'Convert a number of tokens to a number of wei.',
      tags: ['ERC20'],
      operationId: 'normalizeAmount',
      ...partialRouteSchema,
      querystring: normalizeRequestQuerySchema,
      response: {
        [StatusCodes.OK]: getReplyBodySchema
      }
    },
    handler: async (request, reply) => {
      const { chain_name_or_id, contract_address } = request.params;
      const { amount } = request.query;

      logger.info('Inside ERC20 Normalize Function');
      logger.silly(`Chain : ${chain_name_or_id}`)
      logger.silly(`Contract Address : ${contract_address}`);

      logger.silly(`Amount : ${amount}`)

      const sdk = await getSDK(chain_name_or_id);
      const contract = await sdk.getContract(contract_address);

      const returnData: any = await contract.erc20.normalizeAmount(amount);
      
      reply.status(StatusCodes.OK).send({
        result: {
          data: returnData
        }
      });
    },
  });
}
