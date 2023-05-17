import { Type } from '@sinclair/typebox';

/**
 * Basic schema for all Request Body String
 */
export const readRequestBodySchema = Type.Object({
  function_name: Type.String({
    description: 'Name of the function to call on Contract',
    examples: ["balanceOf"]
  }),
  args: Type.Optional(Type.Array(Type.String({
    description: 'Arguments for the function. Comma Separated',
    examples:[""]
   }))),
});