import { Type } from '@sinclair/typebox';

/**
 * Basic schema for all Request Query String
 */
export const writeRequestQuerySchema = Type.Object({
  function_name: Type.String({
    description: 'Name of the function to call on Contract',
    examples: ["transferFrom"]
  }),
  args: Type.String({
   description: 'Arguments for the function. Comma Separated',
   examples:["0x1946267d81Fb8aDeeEa28e6B98bcD446c8248473,0x3EcDBF3B911d0e9052b64850693888b008e18373,0"]
  }),
});