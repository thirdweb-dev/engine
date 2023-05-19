import { FastifyInstance } from 'fastify';
import { StatusCodes } from 'http-status-codes';

import { getSDK } from '../../../../../helpers';
import { partialRouteSchema } from '../../../../../helpers/sharedApiSchemas';
import {
  allowanceOfRequestQuerySchema,
  allowanceOfRouteSchema,
  allowanceOfReplyBodySchema
} from "../../../../../schemas/erc20/standard/allowanceOf";

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
      request.log.info('Inside ERC20 AllowanceOf Function');
      request.log.debug(`Chain : ${chain_name_or_id}`)
      request.log.debug(`Contract Address : ${contract_address}`);

      request.log.debug(`Owner Wallet : ${owner_wallet}`)
      request.log.debug(`Spender Wallet : ${spender_wallet}`);

      const sdk = await getSDK(chain_name_or_id);
      const contract = await sdk.getContract(contract_address);

      const returnData: any = await contract.erc20.allowanceOf(owner_wallet ? owner_wallet : "", spender_wallet ? spender_wallet : "");
      
      reply.status(StatusCodes.OK).send({
        result: {
          data: returnData
        }
      });
    },
  });
}
