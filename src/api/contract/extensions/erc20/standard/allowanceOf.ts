import { FastifyInstance } from 'fastify';
import { StatusCodes } from 'http-status-codes';

import { getSDK } from '../../../../../helpers/sdk';
import { partialRouteSchema } from '../../../../../sharedApiSchemas';
import { logger } from '../../../../../utilities/logger';
import { allowanceOfRequestQuerySchema, allowanceOfRouteSchema, allowanceOfReplyBodySchema } from "../../../../../schemas/erc20/standard/allowanceOf";

export async function erc20AllowanceOf(fastify: FastifyInstance) {
  fastify.route<allowanceOfRouteSchema>({
    method: 'GET',
    url: '/contract/:chain_name_or_id/:contract_address/erc20/allowanceOf',
    schema: {
      description: "Get the allowance of the specified wallet address funds.",
      tags: ['ERC20'],
      operationId: 'allowanceOf',
      ...partialRouteSchema,
      querystring: allowanceOfRequestQuerySchema,
      response: {
        [StatusCodes.OK]: allowanceOfReplyBodySchema
      }
    },
    handler: async (request, reply) => {
      const { chain_name_or_id, contract_address } = request.params;
      const { spender_wallet, owner_wallet } = request.query;
      logger.info('Inside ERC20 AllowanceOf Function');
      logger.silly(`Chain : ${chain_name_or_id}`)
      logger.silly(`Contract Address : ${contract_address}`);

      logger.silly(`Owner Wallet : ${owner_wallet}`)
      logger.silly(`Spender Wallet : ${spender_wallet}`);

      const sdk = await getSDK(chain_name_or_id);
      const contract = await sdk.getContract(contract_address);

      const returnData: any = await contract.erc20.allowanceOf(owner_wallet ? owner_wallet : "", spender_wallet ? spender_wallet : "");
      
      reply.status(StatusCodes.OK).send({
        result: {
          data: returnData
        },
        error: null,
      });
    },
  });
}
