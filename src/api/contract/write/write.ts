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

const requestQuerySchema = Type.Object({
  function_name: Type.String(),
  args: Type.Array(Type.String()),
});

const replyBodySchema = Type.Object({
  result: Type.Object({
    data: Type.String(),
  }),
  error: baseReplyErrorSchema,
});

const fullRouteSchema: FastifySchema = {
  params: requestParamSchema,
  querystring: requestQuerySchema,
  response: {
    [StatusCodes.OK]: replyBodySchema
  },
};

interface schemaTypes extends RouteGenericInterface {
  Params: Static<typeof requestParamSchema>;
  Querystring: Static<typeof requestQuerySchema>;
  Reply: Static<typeof replyBodySchema>;
}

// updated chain to chain_name as I saw SDK needs chain_name
// can update the implementation to retrive chain_name wrt to the chainId passed
export async function readContract(fastify: FastifyInstance) {
  fastify.route<schemaTypes, GenericThirdwebRequestContext>({
    method: 'POST',
    url: '/contract/:chain_name/:contract_address/write',
    schema: fullRouteSchema,
    handler: async (request, reply) => {
      const { chain_name, contract_address } = request.params;
      const { function_name, args } = request.query;
      const sdk = await getSDK(chain_name);
      const contract = await sdk.getContract(contract_address);

      const returnData: any = await contract.call(function_name);
      
      reply.status(StatusCodes.OK).send({
        result: {
          data: returnData
        },
        error: null,
      });
    },
  });
}
