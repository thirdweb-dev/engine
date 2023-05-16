import { FastifyInstance } from 'fastify';
import { StatusCodes } from 'http-status-codes';
import { getSDK } from '../../../../../helpers/sdk';
import { partialRouteSchema, } from '../../../../../sharedApiSchemas';
import { logger } from '../../../../../utilities/logger';
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
      logger.info('Inside ERC20 TotalSupply Function');
      logger.silly(`Chain : ${chain_name_or_id}`)
      logger.silly(`Contract Address : ${contract_address}`);

      const sdk = await getSDK(chain_name_or_id);
      const contract = await sdk.getContract(contract_address);

      const returnData = await contract.erc20.totalSupply() as unknown as typeof totalSupplyReplyBodySchema;
      logger.info(`${JSON.stringify(returnData)}`);

      reply.status(StatusCodes.OK).send({
        result: {
          data: {
            value: returnData.value,
            symbol: returnData.symbol,
            name: returnData.name,
            decimals: returnData.decimals,
            displayValue: returnData.displayValue,
          }
        },
        error: null,
      });
    },
  });
}
