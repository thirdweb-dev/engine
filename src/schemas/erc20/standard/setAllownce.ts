import { Static, Type } from '@sinclair/typebox';
import { schemaTypes } from '../../../sharedApiSchemas';

/**
 * Basic schema for ERC20 - Set Allowance Request Query String
 */
export const setAllowanceRequestQuerySchema = Type.Object({
  spender_address: Type.String({
    description: 'Address of the wallet to allow transfers from',
    examples: ["0x3EcDBF3B911d0e9052b64850693888b008e18373"]
   }),
  amount: Type.String({
   description: 'The number of tokens to give as allowance',
   examples: ["100"]
  }),
});

export interface setAllowanceRouteSchema extends schemaTypes {
  Querystring: Static<typeof setAllowanceRequestQuerySchema>;
}