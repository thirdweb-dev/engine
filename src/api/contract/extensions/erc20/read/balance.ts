import { FastifyInstance } from 'fastify';
import { StatusCodes } from 'http-status-codes';
import { getSDK } from '../../../../../helpers';
import { partialRouteSchema, schemaTypes } from '../../../../../helpers/sharedApiSchemas';
import { balanceReplyBodySchema } from '../../../../../schemas/erc20/standard/balance';

export async function erc20Balance(fastify: FastifyInstance) {
  fastify.route<schemaTypes>({
    method: 'GET',
    url: '/contract/:chain_name_or_id/:contract_address/erc20/balance',
    schema: {
      description: 'View the balance (i.e. number of tokens) of the connected (Admin) wallet',
      tags: ['ERC20'],
      operationId: 'balance',
      ...partialRouteSchema,
      response: {
        [StatusCodes.OK]: balanceReplyBodySchema
      }
    },
    handler: async (request, reply) => {
      const { chain_name_or_id, contract_address } = request.params;
      request.log.info('Inside ERC20 Balance Function');
      request.log.debug(`Chain : ${chain_name_or_id}`)
      request.log.debug(`Contract Address : ${contract_address}`);

      const sdk = await getSDK(chain_name_or_id);
      const contract = await sdk.getContract(contract_address);

      const returnData: any = await contract.erc20.totalSupply();
      
      reply.status(StatusCodes.OK).send({
        result: {
          data: returnData
        }
      });
    },
  });
}
