import { FastifyInstance } from 'fastify';
import { StatusCodes } from 'http-status-codes';

import { getSDK } from '../../../../../helpers/sdk';
import { partialRouteSchema, } from '../../../../../sharedApiSchemas';
import { logger } from '../../../../../utilities/logger';
import { balanceOfRequestQuerySchema, balanceOfRouteSchema, balanceOfReplyBodySchema } from '../../../../../schemas/erc20/standard/balanceOf';

export async function erc20BalanceOf(fastify: FastifyInstance) {
  fastify.route<balanceOfRouteSchema>({
    method: 'GET',
    url: '/contract/:chain_name_or_id/:contract_address/erc20/balanceOf',
    schema: {
      description: 'Check the balance Of the wallet address',
      tags: ['ERC20'],
      operationId: 'balanceOf',
      ...partialRouteSchema,
      querystring: balanceOfRequestQuerySchema,
      response: {
        [StatusCodes.OK]: balanceOfReplyBodySchema
      }
    },
    handler: async (request, reply) => {
      const { chain_name_or_id, contract_address } = request.params;
      const { wallet_address } = request.query;
      logger.info('Inside ERC20 BalanceOf Function');
      logger.silly(`Chain : ${chain_name_or_id}`)
      logger.silly(`Contract Address : ${contract_address}`);

      const sdk = await getSDK(chain_name_or_id);
      const contract = await sdk.getContract(contract_address);

      const returnData: any = await contract.erc20.balanceOf(wallet_address);
      
      reply.status(StatusCodes.OK).send({
        result: {
          data: returnData
        },
        error: null,
      });
    },
  });
}
