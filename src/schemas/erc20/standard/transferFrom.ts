import { Static, Type } from '@sinclair/typebox';
import { schemaTypes } from '../../../helpers/sharedApiSchemas';

/**
 * Basic schema for ERC20 - Transfer From Request Query String
 */
export const transferFromRequestBodySchema = Type.Object({
  from_address: Type.String({
    description: 'Address of the wallet sending the tokens'
  }),
  to_address: Type.String({
    description: 'Address of the wallet you want to send the tokens to'
  }),
  amount: Type.String({
   description: 'The amount of tokens you want to send',
  }),
});


// Example for the Request Body
transferFromRequestBodySchema.examples = [{
  from_address: "0x....",
  to_address: "0x...",
  amount: "0.1"
}];

export interface transferFromRouteSchema extends schemaTypes {
  Body: Static<typeof transferFromRequestBodySchema>;
}
