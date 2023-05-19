// import { FastifyInstance, RouteGenericInterface } from 'fastify';
// import { StatusCodes } from 'http-status-codes';
// import { getSDK } from '../../../../helpers/sdk';
// import { Static } from '@sinclair/typebox';
// import { fullRouteSchema, schemaTypes } from '../../../../sharedApiSchemas';

// export async function erc721WriteContract(fastify: FastifyInstance) {
//   fastify.route<schemaTypes>({
//     method: 'POST',
//     url: '/contract/:chain_name_or_id/:contract_address/erc721/write',
//     schema: {
//       description: 'Write To ERC721 Contract',
//       tags: ['extensions'],
//       operationId: 'erc721Write',
//       ...fullRouteSchema,
//     },
//     handler: async (request, reply) => {
//       const { chain_name_or_id, contract_address } = request.params;
//       const { function_name, args } = request.query;
      
//       request.log.info('Inside Write Function');
//       request.log.debug(`Chain : ${chain_name_or_id}`)
//       request.log.debug(`Contract Address : ${contract_address}`);

//       request.log.debug(`Function Name : ${function_name}`)
//       request.log.debug(`Contract Address : ${contract_address}`);
//       request.log.debug(`Function Arguments : ${args}`);

//       const sdk = await getSDK(chain_name_or_id);
//       const contract:any = await sdk.getContract(contract_address);
      
//       const returnData: any = await contract.call(function_name, args ? args.split(',') : []);
      
//       reply.status(StatusCodes.OK).send({
//         result: {
//           transaction: returnData?.receipt
//         }
//       });
//     },
//   });
// }
