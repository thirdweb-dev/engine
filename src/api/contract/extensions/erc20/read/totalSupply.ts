import { FastifyInstance } from 'fastify';
import { StatusCodes } from 'http-status-codes';
import { getSDK } from '../../../../../helpers';
import { partialRouteSchema, } from '../../../../../helpers/sharedApiSchemas';
import { totalSupplyRouteSchema, totalSupplyReplyBodySchema } from '../../../../../schemas/erc20/standard/totalSupply';

export async function erc20TotalSupply(fastify: FastifyInstance) {
  fastify.route<totalSupplyRouteSchema>({
    method: 'GET',
    url: '/contract/:chain_name_or_id/:contract_address/erc20/totalSupply',
    schema: {
      description: 'Get the number of tokens in circulation for the contract.',
      tags: ['ERC20'],
      operationId: 'totalSupply',
      ...partialRouteSchema,
      response: {
        [StatusCodes.OK]: totalSupplyReplyBodySchema,
      }
    },
    handler: async (request, reply) => {
      const { chain_name_or_id, contract_address } = request.params;
      request.log.info('Inside ERC20 TotalSupply Function');
      request.log.debug(`Chain : ${chain_name_or_id}`)
      request.log.debug(`Contract Address : ${contract_address}`);

      const sdk = await getSDK(chain_name_or_id);
      const contract = await sdk.getContract(contract_address);

      const returnData = await contract.erc20.totalSupply();
      request.log.info(`${JSON.stringify(returnData)}`);

      reply.status(StatusCodes.OK).send({
        result: {
          data: {
            value: returnData.value.toString(),
            symbol: returnData.symbol,
            name: returnData.name,
            decimals: returnData.decimals.toString(),
            displayValue: returnData.displayValue,
          }
        }
      });
    },
  });
}
