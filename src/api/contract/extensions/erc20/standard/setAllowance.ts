import { FastifyInstance } from 'fastify';
import { StatusCodes } from 'http-status-codes';

import { getSDK } from '../../../../../helpers/sdk';
import { partialRouteSchema } from '../../../../../sharedApiSchemas';
import { logger } from '../../../../../utilities/logger';
import { setAllowanceRequestQuerySchema, setAllowanceRouteSchema } from '../../../../../schemas/erc20/standard/setAllownce';

export async function erc20SetAlowance(fastify: FastifyInstance) {
  fastify.route<setAllowanceRouteSchema>({
    method: 'POST',
    url: '/contract/:chain_name_or_id/:contract_address/erc20/setAllowance',
    schema: {
      description: "Grant allowance to another wallet address to spend the connected (Admin) wallet's funds (of this token).",
      tags: ['ERC20'],
      operationId: 'setAllowance',
      ...partialRouteSchema,
      querystring: setAllowanceRequestQuerySchema
    },
    handler: async (request, reply) => {
      const { chain_name_or_id, contract_address } = request.params;
      logger.info('Inside ERC20 Set Allowance Function');
      logger.silly(`Chain : ${chain_name_or_id}`)
      logger.silly(`Contract Address : ${contract_address}`);

      const sdk = await getSDK(chain_name_or_id);
      const contract = await sdk.getContract(contract_address);

      const returnData: any = await contract.erc20.totalSupply();
      
      reply.status(StatusCodes.OK).send({
        result: {
          data: returnData
        },
        error: null,
      });
    },
  });
}
