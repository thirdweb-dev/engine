import { FastifyInstance } from 'fastify';
import { StatusCodes } from 'http-status-codes';
import { connectToDB } from '../../../helpers/index';
import { partialRouteSchema } from '../../../helpers/sharedApiSchemas';
import { writeRequestBodySchema, writeSchema } from '../../../schemas/contract/write';

export async function writeToContract(fastify: FastifyInstance) {
  fastify.route<writeSchema>({
    method: 'POST',
    url: '/contract/:chain_name_or_id/:contract_address/write',
    schema: {
      description: 'Write to Contract',
      tags: ['Contract'],
      operationId: 'write',
      ...partialRouteSchema,
      body: writeRequestBodySchema,
    },
    handler: async (request, reply) => {
      const { chain_name_or_id, contract_address } = request.params;
      const { function_name, args } = request.body;
      
      // Connect to DB
      const dbInstance = await connectToDB();
      
      // const sdk = await getSDK(chain_name_or_id);
      // const contract:any = await sdk.getContract(contract_address);
      
      // const returnData: any = await contract.call(function_name, args);
      
      // Closing the DB Connection
      await dbInstance.destroy();

      reply.status(StatusCodes.OK).send({
        result: {
          queuedId: "", 
        }
      });
    },
  });
}