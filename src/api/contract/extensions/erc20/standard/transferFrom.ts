import { FastifyInstance } from 'fastify';
import { StatusCodes } from 'http-status-codes';

import { getSDK } from '../../../../../helpers/sdk';
import { partialRouteSchema } from '../../../../../sharedApiSchemas';
import { logger } from '../../../../../utilities/logger';
import { transferFromRequestQuerySchema, transferFromRouteSchema } from '../../../../../schemas/erc20/standard/transferFrom';


export async function erc20TransferFrom(fastify: FastifyInstance) {
  fastify.route<transferFromRouteSchema>({
    method: 'POST',
    url: '/contract/:chain_name_or_id/:contract_address/erc20/transferFrom',
    schema: {
      description: 'Transfer tokens from the connected wallet to another wallet.',
      tags: ['ERC20'],
      operationId: 'transferFrom',
      ...partialRouteSchema,
      querystring: transferFromRequestQuerySchema
    },
    handler: async (request, reply) => {
      const { chain_name_or_id, contract_address } = request.params;
      const { from_address, to_address, amount } = request.query;
      logger.info('Inside ERC20 - Transfer Function');
      logger.silly(`Chain : ${chain_name_or_id}`)
      logger.silly(`Contract Address : ${contract_address}`);

      logger.silly(`To Address : ${to_address}`)
      logger.silly(`Amount : ${amount}`);

      const sdk = await getSDK(chain_name_or_id);
      const contract = await sdk.getContract(contract_address);

      const returnData: any = await contract.erc20.transferFrom(from_address, to_address, amount);
      
      reply.status(StatusCodes.OK).send({
        result: {
          transaction: returnData?.receipt
        },
        error: null,
      });
    },
  });
}
