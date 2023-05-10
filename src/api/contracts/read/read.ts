import { FastifyInstance, RouteGenericInterface } from 'fastify';
import { Static, Type } from '@sinclair/typebox';
import { baseReplyErrorSchema } from '../../../sharedApiSchemas';
import { StatusCodes } from 'http-status-codes';
import { FastifySchema } from 'fastify/types/schema';
import { GenericThirdwebRequestContext } from '../../../types/fastify';
import { getSDK } from "../../../helpers/sdk";

const requestParamSchema = Type.Object({
  chain_name: Type.String(),
  contract_address: Type.String(),
});

const replyBodySchema = Type.Object({
  result: Type.Array(
    Type.Object({
      chain_name: Type.String(),
      contract_address: Type.String(),
    })
  ),
  error: baseReplyErrorSchema,
});

const fullRouteSchema: FastifySchema = {
  params: requestParamSchema,
  response: {
    [StatusCodes.OK]: replyBodySchema
  },
};

interface schemaTypes extends RouteGenericInterface {
  Params: Static<typeof requestParamSchema>;
  Reply: Static<typeof replyBodySchema>;
}

// updated chain to chain_name as I saw SDK needs chain_name
// can update the implementation to retrive chain_name wrt to the chainId passed
export async function readContract(fastify: FastifyInstance) {
  fastify.route<schemaTypes, GenericThirdwebRequestContext>({
    method: 'GET',
    url: '/contracts/:chain_name/:contract_address/read',
    schema: fullRouteSchema,
    handler: async (request, reply) => {
      const { chain_name, contract_address } = request.params;
      const sdk = await getSDK(chain_name);
      const contract = await sdk.getContract(contract_address);
      
      reply.status(StatusCodes.OK).send({
        // keys: apiKeyInfo.map((keyInfo) => ({
        //   key: keyInfo.key,
        //   creatorWalletAddress: keyInfo.creatorWalletAddress,
        //   revoked: keyInfo.revoked,
        // })),
        result: [{
          chain_name,
          contract_address
        }],
        error: null,
      });
    },
  });
}
