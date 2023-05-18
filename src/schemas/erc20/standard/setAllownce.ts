import { Static, Type } from '@sinclair/typebox';
import { schemaTypes } from '../../../sharedApiSchemas';

/**
 * Basic schema for ERC20 - Set Allowance Request Query String
 */
export const setAllowanceRequestBodySchema = Type.Object({
  spender_address: Type.String({
    description: 'Address of the wallet to allow transfers from',
   }),
  amount: Type.String({
   description: 'The number of tokens to give as allowance',
  }),
});

// Adding an Example for the above body
setAllowanceRequestBodySchema.examples = [{
  spender_address: "0x3EcDBF3B911d0e9052b64850693888b008e18373",
  amount: "100"
}];

export interface setAllowanceRouteSchema extends schemaTypes {
  Body: Static<typeof setAllowanceRequestBodySchema>;
}