import { Static, Type } from '@sinclair/typebox';
import { schemaTypes } from '../../../helpers/sharedApiSchemas';

/**
 * Basic schema for ERC20 - Transfer Request Query String
 */
export const transferRequestBodySchema = Type.Object({
  to_address: Type.String({
    description: 'Address of the wallet you want to send the tokens to',
    
  }),
  amount: Type.String({
   description: 'The amount of tokens you want to send',
  }),
});

// Example for the Request Body
transferRequestBodySchema.examples = [{
  to_address: "0x3EcDBF3B911d0e9052b64850693888b008e18373",
  amount: "0.1"
}];

export interface transferRouteSchema extends schemaTypes {
  Body: Static<typeof transferRequestBodySchema>;
}