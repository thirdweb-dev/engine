import { TSchema, Type } from '@sinclair/typebox';
import { FastifySchema } from 'fastify/types/schema';
import { StatusCodes } from 'http-status-codes';

/**
 * Requests to this server follow a pretty basic format.
 *
 * Requests:
 *   - Have an `input` field that contains the actual input data.
 *
 * Responses:
 *   - Have data stored in the response body JSON.
 *   - Have an `error` field that contains application/unexpected errors, or null.
 *
 * Non-GET Handlers always expect the request body to be a JSON object. Per the HTTP spec, POST/PUT/PATCH requests should have a body, even if it's an empoty object.
 *
 * Similarly, responses always contain an `error` field. If there is no `error`, it is set to `null`.
 */

export const errorSchema = Type.Object({
  message: Type.String(),
  code: Type.String(),
  stack: Type.Optional(Type.String()),
  statusCode: Type.Number(),
  data: Type.Optional(Type.Any()),
});

export const Nullable = <T extends TSchema>(type: T) =>
  Type.Union([type, Type.Null()]);
/**
 * Used to surface application errors to the client. The `code` field is set by the request handler.
 */
export const baseReplyErrorSchema = Nullable(errorSchema);

/**
 * Basic schema for all API request headers.
 */
export const developerRequestHeaderSchema = Type.Object({
  // Optional because the API key is not required for all routes.
  'x-api-key': Type.String(),
});

/**
 * Basic schema for all Dashboard request headers.
 */
export const dashboardRequestHeaderSchema = Type.Object({
  // Optional because the API key is not required for all routes.
  Authorization: Type.String(),
});

export const requestParamSchema = Type.Object({
  chain_name: Type.String(),
  contract_address: Type.String(),
});

export const requestQuerySchema = Type.Object({
  function_name: Type.String(),
  args: Type.Optional(Type.Array(Type.Any())),
});

export const replyBodySchema = Type.Object({
  result: Type.Object({
    data: Type.String(),
    transaction: Type.Optional(Type.Any())
  }),
  error: baseReplyErrorSchema,
});

export const fullRouteSchema: FastifySchema = {
  params: requestParamSchema,
  querystring: requestQuerySchema,
  response: {
    [StatusCodes.OK]: replyBodySchema
  },
};
