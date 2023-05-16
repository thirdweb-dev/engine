import { Type } from '@sinclair/typebox';
// import { FastifySchema } from 'fastify/types/schema';
// import { RouteGenericInterface } from 'fastify';
// import { baseReplyErrorSchema, requestParamSchema } from '../../sharedApiSchemas'

/**
 * Basic schema for all Request Query String
 */
export const requestQuerySchema = Type.Object({
  function_name: Type.String({
    description: 'Name of the function to call on Contract'
  }),
  args: Type.Optional(Type.String({
   description: 'Arguments for the function. Comma Separated'
  })),
});

// /**
//  * Basic schema for all Response Body
//  */
// const replyBodySchema = Type.Object({
//   result: Type.Optional(Type.Object({
//     data: Type.Optional(Type.String()),
//     transaction: Type.Optional(Type.Any())
//   })),
//   error: baseReplyErrorSchema,
//   authorized: Type.Optional(Type.Boolean()),
// });

// /**
//  * Basic Fastify schema for request/response
//  */
// export const readRouteSchema: FastifySchema = {
//   querystring: requestQuerySchema
// };